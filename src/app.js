import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import VueRouter from 'vue-router';
import mitt from 'mitt';
import { ipcRenderer } from 'electron';

import BalmUI from 'balm-ui'; // Official Google Material Components
import BalmUIPlus from 'balm-ui/dist/balm-ui-plus'; // BalmJS Team Material Components
import 'balm-ui-css';

import router from './router/index.js';
import store from './store/index';
import BeetServer from './lib/BeetServer';
import RendererLogger from './lib/RendererLogger';
import fetchMessages from './lib/i18n';
//import Popups from './components/popups';
import Beetframe from './components/beetframe';

import 'typeface-roboto';
import 'typeface-rajdhani';

//import './css/style.css';
import './scss/beet.scss';

const logger = new RendererLogger;

window.onerror = function (msg, url, lineNo, columnNo, error) {
  logger.error(error);
  console.log(error);
  return false;
};
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

store.dispatch("SettingsStore/loadSettings");
store.dispatch("WhitelistStore/loadWhitelist");

const messages = fetchMessages();

const i18n = createI18n({
  legacy: false, // you must set `false`, to use Composition API
  locale: store.state.SettingsStore.settings.locale.iso ?? 'en',
  fallbackLocale: 'en',
  messages
})

const emitter = mitt();
const app = createApp({});
app.provide('emitter', emitter);

/*
ipcRenderer.on('eventbus', (event,data)=> {
  emitter.emit(data.method, data.payload);
});

emitter.on("main", (data) => {
    ipcRenderer.send(data.method, data.payload);
});
*/

app.config.devtools = true;
app.config.errorHandler = function (err, vm, info) {
  logger.error(err, vm, info);
  console.log("error");
};

app.component('Beetframe', Beetframe);

app.use(i18n);
app.use(VueRouter);
app.use(BalmUI);
app.use(BalmUIPlus);

app.use(router);
app.use(store);
app.mount('#app');

BeetServer.initialize(app, 60555);
