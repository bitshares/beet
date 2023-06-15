import {
    defaultLocale
} from '../../config/i18n.js'

import BeetDB from '../../lib/BeetDB.js';
import RendererLogger from "../../lib/RendererLogger";
const logger = new RendererLogger();
const LOAD_SETTINGS = 'LOAD_SETTINGS';

const mutations = {
    [LOAD_SETTINGS] (state, settings) {
        state.settings = settings;
    }
};

const actions = {
    loadSettings({
        commit
    }) {
        return new Promise(async (resolve, reject) => {
            try {
                let settings = localStorage.getItem("settings");

                if (settings && settings.length > 0) {
                    commit(LOAD_SETTINGS, JSON.parse(settings));
                } else {
                    localStorage.setItem("settings", JSON.stringify(initialState.settings));
                    commit(LOAD_SETTINGS, JSON.parse(initialState.settings));
                }
                resolve();
            } catch (error) {
                console.log(error)
                reject();
            }
        });
    },
    setNode({
        commit
    }, payload) {
        return new Promise(async (resolve, reject) => {
              let settings;
              try {
                  settings = localStorage.getItem("settings");
              } catch (error) {
                  console.log(error)
                  reject(error);
              }

              if (settings && settings.length > 0) {
                  settings = JSON.parse(settings)
              } else {
                  settings = initialState.settings;
              }

              // backwards compatibility
              if (typeof settings.selected_node === "string")
              {
                  settings.selected_node = {}
              }

              try {
                settings.selected_node[payload.chain] = payload.node;
              } catch (error) {
                console.log(`setNode: ${error}`)
              }

              localStorage.setItem("settings", JSON.stringify(settings));
              commit(LOAD_SETTINGS, settings);
              resolve();
        });
    },
    setLocale({
        commit
    }, payload) {
        return new Promise(async (resolve, reject) => {
            let settings;
            try {
                settings = localStorage.getItem("settings");
            } catch (error) {
                console.log(error)
                reject(error);
            }

            if (settings && settings.length > 0) {
                settings = JSON.parse(settings)
            } else {
                settings = initialState.settings;
            }

            settings.locale = payload.locale;
            localStorage.setItem("settings", JSON.stringify(settings));
            commit(LOAD_SETTINGS, settings);
            resolve();
        });
    },
    /**
     * 
     * @param {Object} payload
     */
    setChainPermissions({
        commit
    }, payload) {
        return new Promise(async (resolve, reject) => {
            let settings;
            try {
                settings = localStorage.getItem("settings");
            } catch (error) {
                console.log(error)
                reject(error);
            }

            if (settings && settings.length > 0) {
                settings = JSON.parse(settings)
            } else {
                settings = initialState.settings;
            }

            if (!settings.hasOwnProperty('chainPermissions')) {
                settings['chainPermissions'] = {
                    BTS: [],
                    BTS_TEST: [],
                    TUSC: [],
                    BTC: [],
                    BTC_TEST: [],
                    EOS: [],
                    TLOS: []
                }
            }
            settings.chainPermissions[payload.chain] = payload.rows;
            localStorage.setItem("settings", JSON.stringify(settings));
            commit(LOAD_SETTINGS, settings);
            resolve();
        });
    }
}


const getters = {
    getNode: (state) => state.settings.selected_node,
    getLocale: (state) => state.settings.locale,
    getChainPermissions: (state) => (chain) => {
        if (!state.settings.hasOwnProperty('chainPermissions')) {
            return [];
        }
        return state.settings.chainPermissions[chain];
    }
};

const initialState = {
    settings: {
        locale: defaultLocale,
        selected_node: {},
        chainPermissions: {
            BTS: [],
            BTS_TEST: [],
            TUSC: [],
            BTC: [],
            BTC_TEST: []
        }
    }
};

export default {
    namespaced: true,
    state: initialState,
    actions,
    mutations,
    getters,
};
