import Vue from 'vue/dist/vue.js';
import {
    defaultLocale
} from '../../config/i18n.js'
import BeetDB from '../../lib/BeetDB.js';

import RendererLogger from "../../lib/RendererLogger";
const logger = new RendererLogger();
const LOAD_WHITELIST = 'LOAD_WHITELIST';
const LOAD_AVAILABLE = 'LOAD_AVAILABLE';
const ADD_WHITELIST = 'ADD_WHITELIST';

const mutations = {
    [LOAD_SETTINGS](state, settings) {
        Vue.set(state, 'settings', settings);
    }
};

const actions = {
    loadSettings({
        commit
    }) {
        return new Promise((resolve, reject) => {
            try {
                let settings = localStorage.getItem("settings");
                if (settings && settings.length > 0) {

                    commit(LOAD_SETTINGS, JSON.parse(settings));
                } else {

                    localStorage.setItem("settings", JSON.stringify(initialState.settings));
                    commit(LOAD_SETTINGS, JSON.parse(initialState.settings));
                }
                resolve();
            } catch (e) {
                reject();
            }
        });
    },
}


const getters = {};

const initialState = {
    available: [],
    whitelist: {}
};

export default {
    namespaced: true,
    state: initialState,
    actions,
    mutations,
    getters,
};