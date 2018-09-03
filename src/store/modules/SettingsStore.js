import Vue from 'vue/dist/vue.js';
const LOAD_SETTINGS = 'LOAD_SETTINGS';


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
            try  {
                let settings=localStorage.getItem("settings");
                if (settings && settings.length > 0) {
                    commit(LOAD_SETTINGS, settings);
                }else{
                    localStorage.setItem("settings", JSON.stringify(initialState.settings));
                }
                resolve();
            } catch (e) {
                reject();
            }
        });
    }
}


const getters = {
};


const initialState = {
    'settings': {
    'locale': 'en',
    'selected_node': 'wss://bts-seoul.clockwork.gr'
    }
};

export default {
    namespaced: true,
    state: initialState,
    actions,
    mutations,
    getters,
};