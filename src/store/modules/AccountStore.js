import Vue from 'vue/dist/vue.js';
import RendererLogger from "../../lib/RendererLogger";
import CryptoJS from 'crypto-js';
const logger = new RendererLogger();
const LOAD_ACCOUNTS = 'LOAD_ACCOUNTS';
const CHOOSE_ACCOUNT = 'CHOOSE_ACCOUNT';
const ADD_ACCOUNT = 'ADD_ACCOUNT';
const CLEAR_ACCOUNTS = 'CLEAR_ACCOUNTS';

const accountlist = [];

const mutations = {
    [LOAD_ACCOUNTS](state, accounts) {
        Vue.set(state, 'accountlist', accounts);
        Vue.set(state, 'selectedIndex', 0);
    },
    [CHOOSE_ACCOUNT](state, accountIndex) {

        Vue.set(state, 'selectedIndex', accountIndex);
    },
    [ADD_ACCOUNT](state, account) {

        state.accountlist.push(account);
        Vue.set(state, 'selectedIndex', state.accountlist.length - 1);
    },
    [CLEAR_ACCOUNTS](state) {
        state.selectedIndex = null;
        state.accountlist = [];
    }
};

const actions = {
    addAccount({
        dispatch,
        commit,
        state
    }, payload) {

        return new Promise((resolve, reject) => {
            let index = -1;
            for (let i = 0; i < state.accountlist.length; i++) {
                if ((payload.account.chain == state.accountlist[i].chain) && (payload.account.accountID == state.accountlist[i].accountID)) {
                    index = i;
                    break;
                }
            }
            if (index >= 0) {
                reject('Account already exists');
            } else {

                for (let keytype in payload.account.keys) {
                    payload.account.keys[keytype] = CryptoJS.AES.encrypt(payload.account.keys[keytype], payload.password).toString();
                }
                dispatch('WalletStore/saveAccountToWallet', payload, {
                    root: true
                }).then(() => {

                    commit(ADD_ACCOUNT, payload.account);
                    resolve('Account added');
                }).catch((e) => {
                    reject(e);
                });
            }
        });
    },
    loadAccounts({
        commit
    }, payload) {

        return new Promise((resolve, reject) => {
            if (payload.length > 0) {
                commit(LOAD_ACCOUNTS, payload);
                resolve('Accounts Loaded');
            } else {
                reject('Empty Account list');
            }
        });

    },
    logout({
        commit
    }) {

        return new Promise((resolve, reject) => {

            commit(CLEAR_ACCOUNTS);
            resolve();
        });

    },
    selectAccount({
        commit,
        state
    }, payload) {
        return new Promise((resolve, reject) => {
            let index = -1;
            for (let i = 0; i < state.accountlist.length; i++) {
                if ((payload.chain == state.accountlist[i].chain) && (payload.accountID == state.accountlist[i].accountID)) {
                    index = i;
                    break;
                }
            }
            if (index >= 0) {
                commit(CHOOSE_ACCOUNT, index);
                resolve('Account found');
            } else {
                reject('Account not found');
            }
        });
    }
}


const getters = {
    getAccount: state => state.accountlist[state.selectedIndex],
    getAccountList: state => state.accountlist,
    getSigningKey: (state) => (request) => {
        let signing = state.accountlist.filter(x => {
            return (
                x.accountID == request.account_id &&
                x.chain == request.chain
            );
        });
        if (signing.length !== 1) {
            throw "Invalid signing accounts count";
        }
        return signing[0];
    }
};

const initialState = {
    selectedIndex: null,
    accountlist: accountlist
};

export default {
    namespaced: true,
    state: initialState,
    actions,
    mutations,
    getters,
};