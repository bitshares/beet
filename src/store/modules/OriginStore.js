import Vue from 'vue/dist/vue.js';
import BeetDB from '../../lib/BeetDB.js';
const LOAD_APPS = 'LOAD_APPS';
const ADD_APP = 'ADD_APP';
const UPDATE_APP = 'UPDATE_APP';
const NEW_REQUEST = 'NEW_REQUEST';

const mutations = {
    [LOAD_APPS](state, apps) {
        Vue.set(state, 'apps', apps);
    },
    [ADD_APP](state, app) {
        console.log("OriginStore.add_app");
        state.apps.push(app);
    },
    [UPDATE_APP](state, app) {
        console.log("OriginStore.update_app");
        state.apps.forEach(function(item, i) {
            if (item.identityhash == app.identityhash) {
                console.log("OriginStore.update_app replace", state.apps[i], app);
                state.apps[i] = app;
            }
        });
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
    newRequest({
        dispatch,
        commit
    }, payload) {
        return new Promise((resolve, reject) => {
            BeetDB.apps.where('identityhash').equals(payload.identityhash).modify({
                next_hash: payload.next_hash
            }).then(() => {
                dispatch('loadApps');
                commit(NEW_REQUEST, payload);
                resolve();
            }).catch((e) => {
                reject(e);
            });
        });
    },
    addApp({
        commit
    }, payload) {
        return new Promise((resolve, reject) => {
            let db = BeetDB.apps;
            db.where("identityhash").equals(payload.identityhash).toArray().then((res) => {
                if (res.length == 0) {
                    db.add(payload).then((id) => {
                        payload.id = id;
                        commit(ADD_APP, payload);
                        console.log("app added", payload);
                        resolve(payload);
                    }).catch((err) => {
                        reject(err);
                    });
                } else {
                    console.log("app retrieved", res[0]);
                    db.update(res[0].id, payload).then((id)=>{
                        payload.id = id;
                        console.log("app updated", payload);
                        commit(UPDATE_APP, payload);
                        resolve(payload);
                    }).catch((err) => {
                        reject(err);
                    });
                }
            }).catch((err) => {
                reject(err);
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