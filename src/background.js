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
//import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer';
import mitt from 'mitt';
import sha256 from "crypto-js/sha256.js";
import aes from "crypto-js/aes.js";
import ENC from 'crypto-js/enc-utf8.js';
import * as ed from '@noble/ed25519';

import Logger from '~/lib/Logger';
import context_menu from '~/lib/electron_context_menu';
import {initApplicationMenu} from '~/lib/applicationMenu';
import { getBackup } from "./lib/SecureRemote";

var timeout;
context_menu({
  prepend: (params, browserWindow) => [{
      label: 'Beet',
  }]
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let modalWindows = {};
let modalRequests = {};

var isDevMode = process.execPath.match(/[\\/]electron/);
const logger = new Logger(isDevMode ? 3 : 0);
//let first = true;
let tray = null;
//let minimised = false;

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
    let type = request.type;
    let accounts = arg.accounts;
    let existingLinks = arg.existingLinks;

    if (modalWindows[id] || modalRequests[id]) {
        throw 'Modal exists already!';
    }

    modalRequests[id] = {request: request, event: modalEvent};

    let targetURL = `file://${__dirname}/modal.html?`
                    + `id=${id}`
                    + `&type=${type}`
                    + `&request=${JSON.stringify(request)}`;

    if (type === 'link') {
        modalRequests[id]['accounts'] = accounts;
        modalRequests[id]['existingLinks'] = existingLinks;
        targetURL += `&accounts=${JSON.stringify(accounts)}`;
        targetURL += `&existingLinks=${JSON.stringify(existingLinks)}`;
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
  let width = 600;
  let height = 850;
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

  // Open the DevTools.
  /*
  if (isDevMode) {
    installExtension(VUEJS_DEVTOOLS).then(() => {
        mainWindow.webContents.openDevTools();
    });
  }
  */

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      mainWindow = null;
  });

  mainWindow.on('show', function () {
      //minimised = false;
  });

  ipcMain.on('downloadBackup', async (event, arg) => {
    console.log("downloadBackup")
    let toLocalPath = path.resolve(
      app.getPath("desktop"),
      `BeetBackup-${arg.walletName}-${new Date().toISOString().slice(0,10)}.beet`
    );
    let userChosenPath = dialog.showSaveDialog({ defaultPath: toLocalPath });
    if (userChosenPath) {
        let accounts = JSON.stringify({wallet: arg.walletName, accounts: arg.accounts});
        return getBackup(accounts)
        .then(result => {
          if (result) {
              fs.writeFileSync(userChosenPath, result);
          }
        })
    }
  });

  /*
   * Create modal popup & wait for user response
   */
  ipcMain.on('createPopup', async (event, arg) => {
      await createModal(arg, event);
  })

  /*
  ipcMain.on('close', (event, arg) => {
      if (first) {
          tray.displayBalloon({
              icon: __dirname + '/img/beet-notification.png',
              title: "Beet is minimised.",
              content: "It will run in the background until you quit."
          });
          if (arg == true) {
              first = false;
          }
      }

      minimised = true;
      mainWindow.hide();
  });
  */

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


      /*
      if (minimised) {
        tray.displayBalloon({
            icon: __dirname + '/img/beet-tray.png',
            title: arg == 'request'
                    ? "Beet has received a new request."
                    : arg,
            content: "Click here to view"
        });
      }
      */
  });

  let seed, key;
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

  ipcMain.on('key', (event, arg) => {
      if (timeout) {
          clearTimeout(timeout);
      }
      timeout = setTimeout(timeoutHandler, 300000);
      if (key) return;
      key = arg;
  });

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
      const {data, sig} = arg;

      let msgHash;
      try {
        msgHash = sha256('decrypt').toString();
      } catch (error) {
        console.log(error);
        return;
      }

      let isValid;
      try {
        isValid = await ed.verify(sig, msgHash, key);
      } catch (error) {
        console.log(error);
        return;
      }

      if (event && event.sender) {
        event.sender.send(
          'decrypt',
          isValid
            ? aes.decrypt(data, seed).toString(ENC)
            : null
        );
      } else {
        console.log("No event || event.sender")
      }
  });

  ipcMain.on('backup', async (event, arg) => {
      const {data, sig} = arg;

      let msgHash;
      try {
        msgHash = sha256('backup').toString();
      } catch (error) {
        console.log(error);
        return;
      }

      let isValid;
      try {
        isValid = await ed.verify(sig, msgHash, key);
      } catch (error) {
        console.log(error);
        return;
      }

      if (event && event.sender) {
        event.sender.send(
          'backup',
          isValid
            ? aes.encrypt(data, seed).toString()
            : null
        );
      } else {
        console.log("No event || event.sender")
      }


  });

  ipcMain.on('log', (event, arg) => {
      logger[arg.level](arg.data);
  });

  tray.on('click', () => {
      mainWindow.setAlwaysOnTop(true);
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(false);
      //minimised = false;
  });

  tray.on('balloon-click', () => {
      mainWindow.setAlwaysOnTop(true);
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(false);
      //minimised = false;
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
