import Vue from 'vue/dist/vue.js';
import Vuex from 'vuex';
import BeetStore from './modules/BeetStore.js';

Vue.use(Vuex);

const store = new Vuex.Store({
    modules: {
        BeetStore
    }
  });

export default store;