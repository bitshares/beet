import { createI18n } from 'vue-i18n';

const locales = ['en', 'de'];
const namespaces = ['common', 'operations'];

import enCommon from '../translations/common/en.json';
import enOperations from '../translations/operations/en.json';

import deCommon from '../translations/common/de.json';
import deOperations from '../translations/operations/de.json';

function fetchMessages() {
  return {
    'en': {
      'common': enCommon,
      'operations': enOperations
    },
    'de': {
        'common': deCommon,
        'operations': deOperations
    }
  }
}

export const i18n = createI18n({
  legacy: false, // you must set `false`, to use Composition API
  locale: 'en',
  fallbackLocale: 'en',
  messages: fetchMessages()
})
