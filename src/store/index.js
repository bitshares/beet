import Vue from 'vue/dist/vue.js';
import Vuex from 'vuex';
import WalletStore from './modules/WalletStore.js';
import SettingsStore from './modules/SettingsStore.js';

Vue.use(Vuex);

const store = new Vuex.Store({
    modules: {
        WalletStore,
        SettingsStore
    }
  });

export default store;