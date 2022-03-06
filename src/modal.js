import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';

import BalmUI from 'balm-ui'; // Official Google Material Components
import BalmUIPlus from 'balm-ui/dist/balm-ui-plus'; // BalmJS Team Material Components
import 'balm-ui-css';

import store from './store/index';
import RendererLogger from './lib/RendererLogger';
import fetchMessages from './lib/i18n';
import Popups from './components/popups';

import 'typeface-roboto';
import 'typeface-rajdhani';

import './css/style.css';
import './scss/beet.scss';

const logger = new RendererLogger;

window.onerror = function (msg, url, lineNo, columnNo, error) {
  logger.error(error);
  console.log(error);
  return false;
};

store.dispatch("SettingsStore/loadSettings");
store.dispatch("WhitelistStore/loadWhitelist");

const messages = fetchMessages();

const i18n = createI18n({
  locale: store.state.SettingsStore.settings.locale.iso,
  fallbackLocale: 'en',
  messages
});

const app = createApp({});

app.config.devtools = true;
app.config.errorHandler = function (err, vm, info) {
  logger.error(err, vm, info);
  console.log("error");
};

app.component('Popups', Popups);
app.use(i18n);
app.use(BalmUI);
app.use(BalmUIPlus);
app.use(store);
app.mount('#modal');
