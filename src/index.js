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

context_menu({
  prepend: (params, browserWindow) => [{
      label: 'Beet',
  }]
});
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const isDevMode = process.execPath.match(/[\\/]electron/);
const logger = new Logger(3);

if (isDevMode) enableLiveReload();
let first = true;
let tray = null;
let minimised = false;
const createWindow = async () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 500,
    height: 660,
    minWidth: 500,
    minHeight: 660,
    maxWidth: 500,
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
  ipcMain.on('minimise',(event, arg) => {    
    minimised = true;
    mainWindow.minimize();
  });
  ipcMain.on('close',(event, arg) => {
    if (first) {
      tray.displayBalloon({
        icon: __dirname + '/img/beet-notification.png',
        title: "Beet is minimised.",
        content: "It will run in the background until you quit."
      });
      if (arg==true) {
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

  ipcMain.on('log', (event, arg) => {

    logger[arg.level](arg.data);
  });
  tray.on('click', (event) => {
    console.log(event);
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.