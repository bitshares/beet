import Vue from 'vue/dist/vue.js';
import defaultLocale from '../../config/i18n.js'
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

                    commit(LOAD_SETTINGS, JSON.parse(settings));
                }else{
                    localStorage.setItem("settings", JSON.stringify(initialState.settings));
                    commit(LOAD_SETTINGS, JSON.parse(initialState.settings));
                }
                resolve();
            } catch (e) {
                reject();
            }
        });
    },
    setNode({commit},payload) {
        return new Promise((resolve, reject) => {
            try  {
                let settings=localStorage.getItem("settings");
                if (settings && settings.length > 0) {
                    settings=JSON.parse(settings)
                }else{
                    settings=initialState.settings;
                }
                settings.selected_node=payload.node;
                localStorage.setItem("settings", JSON.stringify(settings));
                commit(LOAD_SETTINGS, settings);
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
    'locale': defaultLocale,
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