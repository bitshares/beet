import { createI18n } from 'vue-i18n';

const locales = ['en', 'de'];
const namespaces = ['common', 'operations'];

import enCommon from '../translations/common/en.json';
import enOperations from '../translations/operations/en.json';

import deCommon from '../translations/common/de.json';
import deOperations from '../translations/operations/de.json';

import daCommon from '../translations/common/da.json';
import daOperations from '../translations/operations/da.json';

import etCommon from '../translations/common/et.json';
import etOperations from '../translations/operations/et.json';

import esCommon from '../translations/common/es.json';
import esOperations from '../translations/operations/es.json';

import frCommon from '../translations/common/fr.json';
import frOperations from '../translations/operations/fr.json';

import itCommon from '../translations/common/it.json';
import itOperations from '../translations/operations/it.json';

import jaCommon from '../translations/common/ja.json';
import jaOperations from '../translations/operations/ja.json';

import koCommon from '../translations/common/ko.json';
import koOperations from '../translations/operations/ko.json';

import ptCommon from '../translations/common/pt.json';
import ptOperations from '../translations/operations/pt.json';

import thCommon from '../translations/common/th.json';
import thOperations from '../translations/operations/th.json';

function fetchMessages() {
  return {
    'en': {
      'common': enCommon,
      'operations': enOperations
    },
    'de': {
        'common': deCommon,
        'operations': deOperations
    },
    'da': {
        'common': daCommon,
        'operations': daOperations
    },
    'et': {
        'common': etCommon,
        'operations': etOperations
    },
    'es': {
        'common': esCommon,
        'operations': esOperations
    },
    'fr': {
        'common': frCommon,
        'operations': frOperations
    },
    'it': {
        'common': itCommon,
        'operations': itOperations
    },
    'ja': {
        'common': jaCommon,
        'operations': jaOperations
    },
    'ko': {
        'common': koCommon,
        'operations': koOperations
    },
    'pt': {
        'common': ptCommon,
        'operations': ptOperations
    },
    'th': {
        'common': thCommon,
        'operations': thOperations
    }
  }
}

export const i18n = createI18n({
  legacy: false, // you must set `false`, to use Composition API
  locale: 'en',
  fallbackLocale: 'en',
  messages: fetchMessages()
})
