import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import mitt from 'mitt';

import BalmUI from 'balm-ui'; // Official Google Material Components
import BalmUIPlus from 'balm-ui/dist/balm-ui-plus'; // BalmJS Team Material Components
import 'balm-ui-css';

import {i18n} from './lib/i18n';
import RendererLogger from './lib/RendererLogger';
import Receipt from './components/receipt';

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

const emitter = mitt();
const app = createApp({});
app.provide('emitter', emitter);

app.config.errorHandler = function (err, vm, info) {
  logger.error(err, vm, info);
  console.log("error:" + err);
};

app.component('Receipt', Receipt);
app.use(i18n);

window.t = (key, params) => {
    return i18n.global.t(key, params)
}

app.use(BalmUI, {
    $theme: {
        primary: '#C7088E'
    }
});
app.use(BalmUIPlus);
app.mount('#receipt');

emitter.on('i18n', (data) => {
    i18n.global.locale.value = data
});  