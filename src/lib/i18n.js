import { createI18n } from 'vue-i18n';

const locales = ['en'];
const namespaces = ['common', 'operations'];

import enCommon from '../translations/common/en.json';
import enOperations from '../translations/operations/en.json';

function fetchMessages() {
  return {
    'en': {
      'common': enCommon,
      'operations': enOperations
    }
  }
}

export const i18n = createI18n({
  legacy: false, // you must set `false`, to use Composition API
  locale: 'en',
  fallbackLocale: 'en',
  messages: fetchMessages()
})
