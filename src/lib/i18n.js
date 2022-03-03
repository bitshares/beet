const locales = ['en'];
const namespaces = ['common', 'operations'];

import enCommon from '../translations/common/en.json';
import enOperations from '../translations/operations/en.json';

export function fetchMessages() {
  return {
    'en': {
      'common': enCommon,
      'operations': enOperations
    }
  }
}
