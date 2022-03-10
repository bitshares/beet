import {set} from 'vue';
import {
    defaultLocale
} from '../../config/i18n.js'

import BeetDB from '../../lib/BeetDB.js';
import RendererLogger from "../../lib/RendererLogger";
const logger = new RendererLogger();
const LOAD_SETTINGS = 'LOAD_SETTINGS';

const mutations = {
    [LOAD_SETTINGS](state, settings) {
        set(state, 'settings', settings);
    }
};

const actions = {
    loadSettings({
        commit
    }) {
        return new Promise(async (resolve, reject) => {
            let settings;
            try {
                settings = await BeetDB.settings.get();

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
                  settings = await BeetDB.settings.get({id: payload.wallet_id});
              } catch (error) {
                  console.log(error)
                  reject(error);
              }
              // backwards compatibility
              if (typeof settings.selected_node === "string")
              {
                  settings.selected_node = {}
              }
              settings.selected_node[payload.chain] = payload.node;

              try {
                await BeetDB.settings.set(settings);
              } catch (error) {
                console.log(error)
                reject(error);
              }

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
                settings = await BeetDB.settings.get({id: payload.wallet_id});
            } catch (error) {
                console.log(error)
                reject(error);
            }

            if (!settings && !initialState.settings) {
              console.log(`no settings state`)
              reject();
            } else if (!settings && initialState.settings) {
              settings = initialState.settings;
            }

            settings.locale = payload.locale;

            try {
              await BeetDB.settings.set(settings);
            } catch (error) {
              console.log(error)
              reject(error);
            }

            commit(LOAD_SETTINGS, settings);
            resolve();
        });
    }
}


const getters = {};

const initialState = {
    'settings': {
        'locale': defaultLocale,
        'selected_node': {}
    }
};

export default {
    namespaced: true,
    state: initialState,
    actions,
    mutations,
    getters,
};
