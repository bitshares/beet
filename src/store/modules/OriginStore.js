import Vue from 'vue/dist/vue.js';
import BeetDB from '../../lib/BeetDB.js';
const LOAD_APPS = 'LOAD_APPS';
const ADD_APP = 'ADD_APP';
const NEW_REQUEST = 'NEW_REQUEST';
import RendererLogger from "../../lib/RendererLogger";

const logger=new RendererLogger();

const mutations = {
    [LOAD_APPS](state, apps) {
        Vue.set(state, 'apps', apps);
    },
    [ADD_APP](state, app) {
        state.apps.push(app);
    },
    [NEW_REQUEST]() {

    }
};

const actions = {
    loadApps({
        commit
    }) {
        return new Promise((resolve, reject) => {
            BeetDB.apps.toArray().then((apps) => {
                commit(LOAD_APPS, apps);
                resolve();
            }).catch(() => {
                reject();
            });
        });
    },    
    newRequest({dispatch,
        commit
    }, payload) {
        return new Promise((resolve, reject) => {
            BeetDB.apps.where('apphash').equals(payload.apphash).modify({next_hash: payload.next_hash}).then(() => {            
            dispatch('loadApps');
            commit(NEW_REQUEST, payload);
            resolve();
        }).catch((e) => {
            logger.log(e);
            reject();
        });
    });
    },
    addApp({
        commit
    }, payload) {
        return new Promise((resolve, reject) => {
            BeetDB.apps.add(payload).then((id) => {
                payload.id = id;
                commit(ADD_APP, payload);
                resolve();
            }).catch(() => {
                reject();
            });
        });
    }
}


const getters = {};

const initialState = {
    'apps': []
};

export default {
    namespaced: true,
    state: initialState,
    actions,
    mutations,
    getters,
};