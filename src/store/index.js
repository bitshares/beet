import Vue from 'vue';
import Vuex from 'vuex';
import WalletStore from './modules/WalletStore.js';
import WhitelistStore from './modules/WhitelistStore.js';
import OriginStore from './modules/OriginStore.js';
import SettingsStore from './modules/SettingsStore.js';
import AccountStore from './modules/AccountStore.js';

Vue.config.devtools = true;
Vue.use(Vuex);

const store = new Vuex.Store({
    modules: {
        WalletStore,
        WhitelistStore,
        SettingsStore,
        OriginStore,
        AccountStore
    }
});

export default store;