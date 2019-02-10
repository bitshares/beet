import Vue from 'vue/dist/vue.js';
import Vuex from 'vuex';
import WalletStore from './modules/WalletStore.js';
import OriginStore from './modules/OriginStore.js';
import SettingsStore from './modules/SettingsStore.js';
import AccountStore from './modules/AccountStore.js';

Vue.use(Vuex);

const store = new Vuex.Store({
    modules: {
        WalletStore,
        SettingsStore,
        OriginStore,
        AccountStore
    }
});

export default store;