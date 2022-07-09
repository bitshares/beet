// This is main process of Electron, started as first thing when your
// app starts. It runs through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.
import path from "path";
import url from "url";
import fs from 'fs';

// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  dialog,
  ipcMain,
  Notification
} from 'electron';
import mitt from 'mitt';
import sha256 from "crypto-js/sha256.js";
import aes from "crypto-js/aes.js";
import ENC from 'crypto-js/enc-utf8.js';
import * as secp from "@noble/secp256k1";

import Logger from '~/lib/Logger';
import {initApplicationMenu} from '~/lib/applicationMenu';
import { getSignature } from "./lib/SecureRemote";
import * as Actions from './lib/Actions';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let modalWindows = {};
let modalRequests = {};
var timeout;

var isDevMode = process.execPath.match(/[\\/]electron/);
const logger = new Logger(isDevMode ? 3 : 0);
let tray = null;

/*
 * On modal popup this runs to create child browser window
 */
const createModal = async (arg, modalEvent) => {
    let modalHeight = 400;
    let modalWidth = 600;
    if (!mainWindow) {
        throw 'No main window';
    }

    let request = arg.request;
    let id = request.id;
    if (modalWindows[id] || modalRequests[id]) {
        throw 'Modal exists already!';
    }

    let type = request.type;
    let accounts = arg.accounts;
    let existingLinks = arg.existingLinks;

    modalRequests[id] = {request: request, event: modalEvent};

    let targetURL = `file://${__dirname}/modal.html?`
                    + `id=${id}`
                    + `&type=${type}`
                    + `&request=${JSON.stringify(request)}`;

    if (type === Actions.REQUEST_LINK) {
        modalRequests[id]['existingLinks'] = existingLinks;
        targetURL += `&existingLinks=${JSON.stringify(existingLinks)}`;
    }

    if ([Actions.INJECTED_CALL, Actions.REQUEST_SIGNATURE].includes(type)) {
      modalRequests[id]['visualizedAccount'] = arg.visualizedAccount;
      modalRequests[id]['visualizedParams'] = arg.visualizedParams;
      targetURL += `&visualizedAccount=${btoa(arg.visualizedAccount)}`;
      targetURL += `&visualizedParams=${btoa(arg.visualizedParams)}`;
    }

    if ([Actions.VOTE_FOR, Actions.VERIFY_MESSAGE].includes(type)) {
      modalRequests[id]['payload'] = arg.payload;
      targetURL += `&payload=${JSON.stringify(arg.payload)}`;
    }

    if ([
      Actions.REQUEST_LINK,
      Actions.REQUEST_RELINK,
      Actions.GET_ACCOUNT,
      Actions.SIGN_MESSAGE
    ].includes(type)) {
      modalRequests[id]['accounts'] = accounts;
      targetURL += `&accounts=${JSON.stringify(accounts)}`;
    }

    if ([Actions.TRANSFER].includes(type)) {
      let chain = arg.chain;
      let accountName = arg.accountName;
      let toSend = arg.toSend;

      modalRequests[id]['chain'] = chain;
      modalRequests[id]['accountName'] = accountName;
      modalRequests[id]['toSend'] = toSend;

      targetURL += `&chain=${chain}`;
      targetURL += `&accountName=${btoa(accountName)}`;
      targetURL += `&toSend=${btoa(toSend)}`;
    }

    modalWindows[id] = new BrowserWindow({
        parent: mainWindow,
        title: 'Beet prompt',
        width: modalWidth,
        height: modalHeight,
        minWidth: modalWidth,
        minHeight: modalHeight,
        maxWidth: modalWidth,
        maximizable: false,
        maxHeight: modalHeight,
        useContentSize: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: __dirname + '/img/beet-taskbar.png'
    });

    modalWindows[id].loadURL(targetURL);

    modalWindows[id].once('ready-to-show', () => {
        console.log('ready to show modal')
        modalWindows[id].show();
    })

    modalWindows[id].on('closed', () => {
      if (modalWindows[id]) {
          delete modalWindows[id];
      }

      if (modalRequests[id]) {
          modalRequests[id].event.sender.send(`popupRejected_${id}`, {
              id: id,
              result: {
                  isError: true,
                  method: type,
                  error: 'User closed modal without answering prompt.'
              }
          });
          delete modalRequests[id];
      }
    });
}

/*
 * User approved modal contents. Close window, resolve promise, delete references.
 */
ipcMain.on('clickedAllow', (event, arg) => {
  console.log('ipcmain clickedAllow');
  let id = arg.request.id;

  if (modalWindows[id]) {
    modalWindows[id].close();
    delete modalWindows[id];
  }

  if (modalRequests[id]) {
    modalRequests[id].event.sender.send(`popupApproved_${id}`, arg);
    delete modalRequests[id];
  }
});

/*
 * User rejected modal contents. Close window, reject promise, delete references.
 */
ipcMain.on('clickedDeny', (event, arg) => {
  console.log('ipcmain clickedDeny');
  let id = arg.request.id;

  if (modalWindows[id]) {
    modalWindows[id].close();
    delete modalWindows[id];
  }

  if (modalRequests[id]) {
    modalRequests[id].event.sender.send(`popupRejected_${id}`, arg);
    delete modalRequests[id];
  }
});

/*
 * A modal error occurred. Close window, resolve promise, delete references.
 */
ipcMain.on('modalError', (event, arg) => {
  if (modalWindows[arg.id]) {
    modalWindows[arg.id].close();
    delete modalWindows[arg.id];
  }
  if (modalRequests[arg.id]) {
    modalRequests[arg.id].reject(arg);
    delete modalRequests[arg.id];
  }
});

/*
 * Creating the primary window, only runs once.
 */
const createWindow = async () => {
  let width = 480;
  let height = 695;
  mainWindow = new BrowserWindow({
      width: width,
      height: height,
      minWidth: width,
      minHeight: height,
      maxWidth: width,
      maximizable: false,
      maxHeight: height,
      useContentSize: true,
      autoHideMenuBar: true,
      webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          enableRemoteModule: true
      },
      icon: __dirname + '/img/beet-taskbar.png'
  });

  initApplicationMenu(mainWindow);
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "index.html"),
      protocol: "file:",
      slashes: true
    })
  );

  tray = new Tray(__dirname + '/img/beet-tray.png');
  const contextMenu = Menu.buildFromTemplate([
      {
          label: 'Show App',
          click: function () {
              mainWindow.show();
          }
      },
      {
          label: 'Quit',
          click: function () {
              app.isQuiting = true;
              tray = null;
              app.quit();
          }
      }
  ]);
  tray.setToolTip('Beet');

  tray.on('right-click', (event, bounds) => {
      tray.popUpContextMenu(contextMenu);
  });

  /*
   * Create modal popup & wait for user response
   */
  ipcMain.on('createPopup', async (event, arg) => {
      await createModal(arg, event);
  })

  ipcMain.on('notify', (event, arg) => {
      logger.debug("notify");
      const NOTIFICATION_TITLE = 'Beet wallet notification';
      const NOTIFICATION_BODY = arg == 'request' ? "Beet has received a new request." : arg;

      if (process.platform === 'win32')
      {
          app.setAppUserModelId(app.name);
      }

      function showNotification () {
        new Notification({
          title: NOTIFICATION_TITLE,
          subtitle: 'subtitle',
          body: NOTIFICATION_BODY,
          icon: __dirname + '/img/beet-tray.png',
        }).show()
      }

      showNotification();
  });

  let seed;
  function timeoutHandler() {
      seed = null;
      const emitter = mitt();
      try {
        emitter.emit('timeout', 'logout');
      } catch (error) {
        console.log(error);
      }
      clearTimeout(timeout);
  }

  ipcMain.on('seeding', (event, arg) => {
      if (timeout) {
          clearTimeout(timeout);
      }
      if (arg != '') {
          timeout = setTimeout(timeoutHandler, 300000);
      }
      seed = arg;
  });

  ipcMain.on('decrypt', async (event, arg) => {
      if (timeout) {
          clearTimeout(timeout);
      }
      timeout = setTimeout(timeoutHandler, 300000);

      let dataToDecrypt = arg.data;

      let decryptedData;
      try {
        decryptedData = await aes.decrypt(dataToDecrypt, seed).toString(ENC);
      } catch (error) {
        console.log(error);
      }

      if (event && event.sender) {
        event.sender.send(
          decryptedData ? 'decrypt_success' : 'decrypt_fail',
          decryptedData ?? 'decryption failure'
        );
      } else {
        console.log("No event || event.sender")
      }
  });

  ipcMain.on('downloadBackup', async (event, arg) => {
    let walletName = arg.walletName;
    //let accounts = JSON.parse(atob(arg.accounts));
    let accounts = JSON.parse(arg.accounts);
    let toLocalPath = path.resolve(
      app.getPath("desktop"),
      `BeetBackup-${walletName}-${new Date().toISOString().slice(0,10)}.beet`
    );
    dialog.showSaveDialog({ defaultPath: toLocalPath })
          .then(async (result) => {
            if (result.canceled) {
              console.log("Cancelled saving backup.")
              return;
            }

            let response = await getSignature('backup');
            if (!response) {
              console.log("Error: No signature");
              return;
            }

            let isValid;
            try {
              isValid = await secp.verify(
                response.signedMessage,
                response.msgHash,
                response.pubk
              );
            } catch (error) {
              console.log(error);
              return;
            }

            if (!isValid) {
              console.log("Failed to backup wallet (validation)");
              return;
            }

            let encrypted;
            try {
              encrypted = await aes.encrypt(
                JSON.stringify({wallet: walletName, accounts: accounts}),
                seed
              ).toString();
            } catch (error) {
              console.log(`encrypt: ${error}`);
              return;
            }

            if (!encrypted) {
              console.log("Failed to backup wallet (encryption)");
              return;
            }

            if (encrypted) {
              fs.writeFileSync(result.filePath, encrypted);
            }

          }).catch((error) => {
            console.log(error)
          });

  });

  ipcMain.on('log', (event, arg) => {
      logger[arg.level](arg.data);
  });

  tray.on('click', () => {
      mainWindow.setAlwaysOnTop(true);
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(false);
  });

  tray.on('balloon-click', () => {
      mainWindow.setAlwaysOnTop(true);
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(false);
  });
};

app.disableHardwareAcceleration();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
    createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
      app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
      createWindow();
  }
});
