import {
    app,
    BrowserWindow,
    Menu,
    Tray,
    ipcMain
} from 'electron';
import installExtension from 'electron-devtools-installer';
import {
    enableLiveReload
} from 'electron-compile';
import Logger from './lib/Logger';
import context_menu from './lib/electron_context_menu';
import {
    ec as EC
} from "elliptic";
import CryptoJS from 'crypto-js';

const ec = new EC('secp256k1');
var timeout;
context_menu({
    prepend: (params, browserWindow) => [{
        label: 'Beet',
    }]
});
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const isDevMode = process.execPath.match(/[\\/]electron/);
let logLevel = 0;

if (isDevMode) {
    enableLiveReload();
    logLevel = 3;
}

const logger = new Logger(logLevel);
let first = true;
let tray = null;
let minimised = false;

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
        },
        icon: __dirname + '/img/beet-taskbar.png'
    });

    // and load the index.html of the app.
    mainWindow.loadURL(`file://${__dirname}/index.html`);
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
    tray.setToolTip('Beet')
    tray.on('right-click', (event, bounds) => {
        tray.popUpContextMenu(contextMenu);
    });

    // Open the DevTools.
    if (isDevMode) {
        //await installExtension(VUEJS_DEVTOOLS);
        await installExtension('ljjemllljcmogpfapbkkighbhhppjdbg');
        //mainWindow.webContents.openDevTools();
    }

    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
    /*
      mainWindow.on('minimize', function (event) {
        event.preventDefault();
        if (first) {
          tray.displayBalloon({
            icon: __dirname + '/img/beet-tray.png',
            title: "Beet is minimised.",
            content: "It will run in the background until you quit."
          });
          first = false;
        }
        minimised = true;
        mainWindow.hide();
      });
    */
    mainWindow.on('show', function () {
        minimised = false;
        tray.setHighlightMode('always')
    });
    /*
      mainWindow.on('close', function (event) {
        if (!app.isQuiting) {
          event.preventDefault();

          if (first) {
            tray.displayBalloon({
              icon: __dirname + '/img/beet-tray.png',
              title: "Beet is minimised.",
              content: "It will run in the background until you quit."
            });
            first = false;
          }

          minimised = true;
          mainWindow.hide();
        }

        return false;
      });
      */
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
        if (minimised) {
            if (arg == 'request') {
                tray.displayBalloon({
                    icon: __dirname + '/img/beet-tray.png',
                    title: "Beet has received a new request.",
                    content: "Click here to view"
                });
            } else {
                tray.displayBalloon({
                    icon: __dirname + '/img/beet-tray.png',
                    title: arg,
                    content: "Click here to view"
                });
            }
        }
    });
    let seed, key;
    function timeoutHandler() {
        seed=null;
        mainWindow.webContents.send('eventbus', { method: 'timeout', payload: 'logout'});        
        clearTimeout(timeout);
    }
    ipcMain.on('key', (event, arg) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout= setTimeout(timeoutHandler,300000);
        if (key) return;
        key = arg;
    });
    ipcMain.on('seeding', (event, arg) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        if (arg!='') {
            timeout= setTimeout(timeoutHandler,300000);
        }
        seed = arg;
    });
    ipcMain.on('decrypt', (event, arg) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout= setTimeout(timeoutHandler,300000);
        const {
            data,
            sig
        } = arg;
        let keypair = ec.keyFromPublic(key, 'hex');
        let msgHash = CryptoJS.SHA256('decrypt').toString();

        if (keypair.verify(msgHash, sig)) {

            event.sender.send('decrypt', CryptoJS.AES.decrypt(data, seed).toString(CryptoJS.enc.Utf8));
        } else {
            event.sender.send('decrypt', null);
        }
    });
    ipcMain.on('backup', (event, arg) => {
        const {
            data,
            sig
        } = arg;
        let keypair = ec.keyFromPublic(key, 'hex');
        let msgHash = CryptoJS.SHA256('backup').toString();
        if (keypair.verify(msgHash, sig)) {            
            event.sender.send('backup', CryptoJS.AES.encrypt(data, seed).toString());
        } else {
            event.sender.send('backup', null);
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
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

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