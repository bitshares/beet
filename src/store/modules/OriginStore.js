import Vue from 'vue/dist/vue.js';
import BeetDB from '../../lib/BeetDB.js';
const LOAD_APPS = 'LOAD_APPS';
const ADD_APP = 'ADD_APP';

const mutations = {
    [LOAD_APPS](state, apps) {
        Vue.set(state, 'apps', apps);
    },
    [ADD_APP](state, app) {
        state.apps.push(app);
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