import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';

import BalmUI from 'balm-ui'; // Official Google Material Components
import BalmUIPlus from 'balm-ui/dist/balm-ui-plus'; // BalmJS Team Material Components
import 'balm-ui-css';

import {i18n} from './lib/i18n';
import RendererLogger from './lib/RendererLogger';
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

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

const app = createApp({});
app.config.errorHandler = function (err, vm, info) {
  logger.error(err, vm, info);
  console.log("error:" + err);
};

app.component('Popups', Popups);
app.use(i18n);

window.t = (key) => {
    return i18n.global.t(key)
}

app.use(BalmUI);
app.use(BalmUIPlus);
app.mount('#modal');
