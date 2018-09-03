import Vue from 'vue/dist/vue.js';
import Vuex from 'vuex';
import BeetStore from './modules/BeetStore.js';
import SettingsStore from './modules/SettingsStore.js';

Vue.use(Vuex);

const store = new Vuex.Store({
    modules: {
        BeetStore,
        SettingsStore
    }
  });

export default store;