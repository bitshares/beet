import SecureLS from "secure-ls";
import Vue from 'vue/dist/vue.js';
import {
    ipcRenderer,
} from 'electron';
import {
    v4 as uuid
} from "uuid";
const GET_WALLET = 'GET_WALLET';
const CREATE_WALLET = 'CREATE_WALLET';
const SET_WALLET_STATUS = 'SET_WALLET_STATUS';
const SET_WALLETLIST = 'SET_WALLETLIST';
const REQ_NOTIFY = 'REQ_NOTIFY';

const wallet = {};


const mutations = {
    [GET_WALLET](state, wallet) {
        Vue.set(state, 'wallet', wallet);
    },

    [SET_WALLET_STATUS](state, status) {

        Vue.set(state, 'hasWallet', status);
    },

    [SET_WALLETLIST](state, walletlist) {

        Vue.set(state, 'walletlist', walletlist);
    },
    [REQ_NOTIFY](state, notify) {
        state.ipc.send("notify", notify);
    },
    [CREATE_WALLET](state, wallet) {
        Vue.set(state, 'wallet', wallet);
    }
};

const actions = {
    getWallet({
        commit
    }, payload) {
        return new Promise((resolve, reject) => {
            let ls = new SecureLS({
                encodingType: "aes",
                isCompression: true,
                encryptionSecret: payload.wallet_pass
            });
            try {
                let wallet = ls.get(payload.wallet_id);
                commit(GET_WALLET, wallet);
                resolve();
            } catch (e) {
                reject();
            }
        });
    },
    saveWallet({
        commit
    }, payload) {
        return new Promise((resolve, reject) => {
            try {
                let wallets = localStorage.getItem("wallets");
                let walletid = uuid();
                let newwallet = {
                    id: walletid,
                    name: payload.walletname
                };
                if (!wallets) {
                    wallets = [];
                } else {
                    wallets = JSON.parse(wallets);
                }
                wallets.push(newwallet);
                localStorage.setItem("wallets", JSON.stringify(wallets));
                commit(SET_WALLET_STATUS, true);
                commit(SET_WALLETLIST, wallets);
                let ls = new SecureLS({
                    encodingType: "aes",
                    isCompression: true,
                    encryptionSecret: payload.password
                });
                ls.set(walletid, payload.walletdata);
                commit(GET_WALLET, payload.walletdata);
                resolve();
            } catch (e) {
                reject();
            }
        });
    },
    loadWallets({
        commit
    }) {

        return new Promise((resolve, reject) => {
            try {
                let wallets = JSON.parse(localStorage.getItem("wallets"));
                if (wallets && wallets.length > 0) {
                    commit(SET_WALLET_STATUS, true);
                    commit(SET_WALLETLIST, wallets);
                    resolve('Wallets Found');
                } else {
                    resolve('Wallets not found');
                }
            } catch (e) {
                reject('Wallets not found');
            }
        });
    },
    notifyUser({
        commit
    }, payload) {
        return new Promise((resolve, reject) => {
            if (payload.notify == 'request') {
                commit(REQ_NOTIFY, payload.notify);
                resolve();
            } else {
                reject();
            }
        });
    }
}


const getters = {
    getWallet: state => state.wallet,
    getHasWallet: state => state.hasWallet,
    getWalletList: state => state.walletlist
};


const initialState = {
    wallet: wallet,
    hasWallet: false,
    walletlist: [],
    ipc: ipcRenderer
};

export default {
    namespaced: true,
    state: initialState,
    actions,
    mutations,
    getters,
};