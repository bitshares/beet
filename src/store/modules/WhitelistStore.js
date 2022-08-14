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
    [LOAD_WHITELIST](state, whitelist) {
        state['whitelist'] = whitelist;
    },
    [LOAD_AVAILABLE](state, whitelistable) {
        state['available'] = whitelistable;
    },
    [ADD_WHITELIST](state, whitelisted) {
        state.whitelist.push(whitelisted);
    },
};

const actions = {
    loadWhitelist({
        commit
    }) {
        return new Promise((resolve, reject) => {
            BeetDB.whitelist.toArray().then((whitelist) => {
                commit(LOAD_WHITELIST, whitelist);
                resolve();
            }).catch(() => {
                reject();
            });
        });
    },
    loadAvailable({
        commit
    }) {
        return new Promise((resolve, reject) => {
            BeetDB.whitelistable.toArray().then((whitelistable) => {
                commit(LOAD_AVAILABLE, whitelistable);
                resolve();
            }).catch(() => {
                reject();
            });
        });
    },
    addWhitelist({
        commit
    }, payload) {
        return new Promise((resolve, reject) => {
            let db = BeetDB.whitelist;
            db.add(payload).then((id) => {
                payload.id = id;
                commit(ADD_WHITELIST, payload);
                resolve(payload);
            }).catch((err) => {
                reject(err);
            });

        });
    }
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
