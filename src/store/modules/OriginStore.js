import BeetDB from '../../lib/BeetDB.js';
import RendererLogger from "../../lib/RendererLogger";
const logger = new RendererLogger();
const LOAD_APPS = 'LOAD_APPS';
const ADD_APP = 'ADD_APP';
const UPDATE_APP = 'UPDATE_APP';
const NEW_REQUEST = 'NEW_REQUEST';

const mutations = {
    [LOAD_APPS](state, apps) {
        state['apps'] = apps;
    },
    [ADD_APP](state, app) {
        state.apps.push(app);
    },
    [UPDATE_APP](state, app) {
        state.apps.forEach(function(item, i) {
            if (item.identityhash == app.identityhash) {
                state.apps[i] = app;
            }
        });
    }/*,
    [NEW_REQUEST]() {

    }*/
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
    removeApp({
        dispatch,
        commit
    }, payload) {
        return new Promise((resolve, reject) => {
            let db = BeetDB.apps;
            db.where("id").equals(payload).delete().then((res) => {
                dispatch('loadApps');
            }).catch((err) => {
                reject(err);
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
                        resolve(payload);
                    }).catch((err) => {
                        reject(err);
                    });
                } else {
                    db.update(res[0].id, payload).then((id)=>{
                        payload.id = id;
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


const getters = {
    walletAccessibleDapps: (state) => (account_id, chain) => {
        return state.apps.filter( x => { return x.chain == chain && x.account_id == account_id});
    },
    getExistingLinks: (state) => (appName, origin, chain) => {
        return state.apps.filter((x) => {
            return x.appName == appName && x.origin == origin && chain == "ANY" || x.chain == chain
        })
    },
    getBeetApp: (state) => (request) => {
        let matchingApps state.apps.filter((x) => {
            return x.identityhash == request.payload.identityhash
        })

        return (!matchingApps || !matchingApps.length) {
            return;
        }

        return matchingApps[0];
    }
};

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
