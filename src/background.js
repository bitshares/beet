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
  ipcMain
} from 'electron';
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer';

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
let modalWindow;

var isDevMode = process.execPath.match(/[\\/]electron/);
const logger = new Logger(isDevMode ? 3 : 0);
let first = true;
let tray = null;
let minimised = false;

/*
if (env.name !== "production") {
  const userDataPath = app.getPath("userData");
  //app.setPath("userData", `${userDataPath} (${env.name})`);
}
*/

const createModal = async (args) => {
  let modalHeight = 400;
  let modalWidth = 600;
  if (!createWindow) {
    // Can't create modal without parent window
    return;
  }

  modalWindow = new BrowserWindow({
      parent: createWindow,
      modal: true,
      show: false,
      //
      title: args.title ?? 'Beet prompt',
      //
      width: modalWidth,
      height: modalHeight,
      minWidth: modalWidth,
      minHeight: modalHeight,
      maxWidth: modalWidth,
      maximizable: false,
      maxHeight: modalHeight,
      useContentSize: true,
      frame: false,
      transparent: true,
      webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          enableRemoteModule: true
      },
      icon: __dirname + '/img/beet-taskbar.png'
  });

  modalWindow.loadFile(
    path.join(__dirname, "modal.html"),
    {query: {"type": args.type ?? null}}
  );

  modalWindow.once('ready-to-show', () => {
    modalWindow.show();
  })

  modalWindow.on('closed', () => {
    modalWindow = null;
    // emitter.emit -> popup rejection
  });

  ipcMain.on('rejectModal', (event, arg) => {
    modalWindow = null;
    // emitter.emit -> popup rejection
  });

  /*
  modalWindow.on('show', () => {
    // emit back to the popup?
  });
  */
};


const createWindow = async () => {

  // Create the browser window.
  mainWindow = new BrowserWindow({
      width: 600,
      height: 660,
      minWidth: 600,
      minHeight: 660,
      maxWidth: 600,
      maximizable: false,
      maxHeight: 660,
      useContentSize: true,
      frame: false,
      transparent: true,
      webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          enableRemoteModule: true
      },
      icon: __dirname + '/img/beet-taskbar.png'
  });

  initApplicationMenu();
  // and load the index.html of the app.
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "index.html"),
      protocol: "file:",
      slashes: true
    })
  );

  tray = new Tray(__dirname + '/img/beet-tray.png');
  const contextMenu = Menu.buildFromTemplate([{
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
  if (isDevMode) {
    installExtension(VUEJS_DEVTOOLS).then(() => {
        mainWindow.webContents.openDevTools();
    });
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      mainWindow = null;
  });

  mainWindow.on('show', function () {
      minimised = false;
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
              fs.writeFileSync(userChosenPath,backup);
          }
        })
    }
    //this.emitter.emit("popup", "load-end");
  });

  ipcMain.on('popup', (event, arg) => {
    // create popup modal window
    createModal(arg);
  })

  /*
  ipcMain.on('', (event, arg) => {

  })

  ipcMain.on('', (event, arg) => {

  })

  ipcMain.on('', (event, arg) => {

  })
  */

  ipcMain.on('openDebug', (event, arg) => {
      mainWindow.webContents.openDevTools();
  });

  ipcMain.on('minimise', (event, arg) => {
      minimised = true;
      mainWindow.minimize();
  });

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

  ipcMain.on('notify', (event, arg) => {
      logger.debug("notify");
      if (minimised) {
        tray.displayBalloon({
            icon: __dirname + '/img/beet-tray.png',
            title: arg == 'request'
                    ? "Beet has received a new request."
                    : arg,
            content: "Click here to view"
        });
      }
  });

  let seed, key;
  function timeoutHandler() {
      seed = null;
      try {
        this.emitter.emit('timeout', 'logout');
      } catch (error) {
        console.log(error);
      }
      clearTimeout(timeout);
  }

  ipcMain.on('key', (event, arg) => {
      if (timeout) {
          clearTimeout(timeout);
      }
      timeout = setTimeout(timeoutHandler,300000);
      if (key) return;
      key = arg;
  });

  ipcMain.on('seeding', (event, arg) => {
      if (timeout) {
          clearTimeout(timeout);
      }
      if (arg != '') {
          timeout = setTimeout(timeoutHandler,300000);
      }
      seed = arg;
  });

  ipcMain.on('decrypt', async (event, arg) => {
      if (timeout) {
          clearTimeout(timeout);
      }
      timeout = setTimeout(timeoutHandler,300000);
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
      minimised = false;
  });

  tray.on('balloon-click', () => {
      mainWindow.setAlwaysOnTop(true);
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(false);
      minimised = false;
  });
};

app.disableHardwareAcceleration();
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function() {
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
