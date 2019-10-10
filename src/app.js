import store from './store/index';
import Vue from 'vue';

import BootstrapVue from 'bootstrap-vue';
import Popups from './components/popups';
import Beetframe from './components/beetframe';
import VueRouter from 'vue-router';
import router from './router/index.js';
import i18next from 'i18next';
import Backend from "i18next-node-fs-backend";
import VueI18Next from '@panter/vue-i18next';
import BeetServer from "./lib/BeetServer";
import RendererLogger from "./lib/RendererLogger";
import 'typeface-roboto';
import 'typeface-rajdhani';

import "./css/style.css";
import './scss/beet.scss';

const logger = new RendererLogger;
Vue.config.errorHandler = function (err, vm, info) {
  logger.error(err, vm, info);
  console.log("error");
};
window.onerror = function (msg, url, lineNo, columnNo, error) {
  logger.error(error);
  console.log(error);
  return false;
};
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});
Vue.use(VueI18Next);
Vue.use(BootstrapVue);
Vue.use(VueRouter);
Vue.component('Popups', Popups);
Vue.component('Beetframe', Beetframe);
store.dispatch("SettingsStore/loadSettings");
store.dispatch("WhitelistStore/loadWhitelist");
store.dispatch("OriginStore/loadApps");
i18next.use(Backend).init({
  lng: store.state.SettingsStore.settings.locale.iso,
  ns: ['common', 'operations'],
  defaultNS: 'common',
  backend: {
    loadPath: `${__dirname}/translations/{{ns}}/{{lng}}.json`,
  }
});
const i18n = new VueI18Next(i18next);

const app = new Vue({
  router,
  store,
  i18n: i18n
}).$mount('#app');

BeetServer.initialize(app);
