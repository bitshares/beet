import Vue from 'vue/dist/vue.js';
import {
    ipcRenderer,
} from 'electron';
import {
    v4 as uuid
} from "uuid";
import CryptoJS from 'crypto-js';
import BeetDB from '../../lib/BeetDB.js';
const GET_WALLET = 'GET_WALLET';
const CREATE_WALLET = 'CREATE_WALLET';
const CONFIRM_UNLOCK = 'CONFIRM_UNLOCK';
const SET_WALLET_STATUS = 'SET_WALLET_STATUS';
const SET_WALLET_UNLOCKED = 'SET_WALLET_UNLOCKED';
const SET_WALLETLIST = 'SET_WALLETLIST';
const REQ_NOTIFY = 'REQ_NOTIFY';

const wallet = {};


const mutations = {
    [GET_WALLET](state, wallet) {


        Vue.set(state, 'wallet', wallet);
    },
    [CONFIRM_UNLOCK](state) {
        state.unlocked.resolve();
        Vue.set(state, 'isUnlocked', true);
    },
    [SET_WALLET_STATUS](state, status) {

        Vue.set(state, 'hasWallet', status);
    },

    [SET_WALLET_UNLOCKED](state, unlocked) {

        Vue.set(state, 'unlocked', unlocked);
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
        dispatch,
        commit,
        state
    }, payload) {
        return new Promise((resolve, reject) => {
            BeetDB.wallets_encrypted.get({
                id: payload.wallet_id
            }).then((wallet) => {
                try {
                    let bytes = CryptoJS.AES.decrypt(wallet.data, payload.wallet_pass);
                    let decrypted_wallet = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
                    let public_wallets = state.walletlist.filter((x) => {
                        return x.id == payload.wallet_id
                    });
                    commit(GET_WALLET, public_wallets[0]);
                    let accountlist;
                    if (Array.isArray(decrypted_wallet)) {
                        accountlist = decrypted_wallet;
                    } else {
                        accountlist = [];
                        accountlist.push(decrypted_wallet);
                    }
                    dispatch('AccountStore/loadAccounts', accountlist, {
                        root: true
                    });
                    resolve();
                } catch (e) {
                    throw (e);
                }
            }).catch((e) => {
                reject(e);
            });
        });
    },
    
    confirmUnlock({
        commit
    }) {
        commit(CONFIRM_UNLOCK);
    },
    saveWallet({
        commit,
        dispatch
    }, payload) {
        return new Promise((resolve, reject) => {

            //let wallets = localStorage.getItem("wallets");
            let walletid = uuid();
            let newwallet = {
                id: walletid,
                name: payload.walletname,
                chain: payload.walletdata.chain,
                accounts: [payload.walletdata.accountID]
            };
            BeetDB.wallets_public.put(newwallet).then(() => {
                BeetDB.wallets_public.toArray().then((wallets) => {
                    let unlock;
                    let unlocked = new Promise(function (resolve) {
                        unlock = resolve
                    });
                    commit(SET_WALLET_UNLOCKED, {
                        promise: unlocked,
                        resolve: unlock
                    });
                    commit(SET_WALLET_STATUS, true);
                    commit(SET_WALLETLIST, wallets);
                    let walletdata = CryptoJS.AES.encrypt(JSON.stringify(payload.walletdata), payload.password).toString();
                    BeetDB.wallets_encrypted.put({
                        id: walletid,
                        data: walletdata
                    });
                    commit(GET_WALLET, newwallet);
                    dispatch('AccountStore/loadAccounts', walletdata, {
                        root: true
                    });
                    resolve();
                }).catch((e) => {
                    throw (e);
                });
            }).catch((e) => {
                reject(e);
            });
        });
    },
    saveAccountToWallet({
        commit,
        state,
        rootState
    }, payload) {
        return new Promise((resolve, reject) => {
            let walletdata =  Object.assign({}, rootState.AccountStore.accountlist);
            let newwalletdata=[];
            // Backwards compatibility            
            if (Array.isArray(walletdata)) {
                newwalletdata=walletdata;
                newwalletdata.push(payload.account);
            } else {
                newwalletdata.push(walletdata);
                newwalletdata.push(payload.account);
            }
            
            let encwalletdata = CryptoJS.AES.encrypt(JSON.stringify(newwalletdata), payload.password).toString();
            let updatedWallet = state.wallet;
            updatedWallet.accounts.push(payload.account.accountID);
            console.log(updatedWallet);
            BeetDB.wallets_encrypted.update(updatedWallet.id, {
                data: encwalletdata
            }).then(() => {
                BeetDB.wallets_public.update(updatedWallet.id, {
                    accounts: updatedWallet.accounts
                }).then(() => {
                    commit(GET_WALLET, updatedWallet);
                    resolve('Account saved');
                }).catch(() => {
                    reject('Could not update public wallet data');
                });
            }).catch((e) => {
                reject('Could not save wallet data: '+e);
            });
        });
    },
    loadWallets({
        commit
    }) {

        return new Promise((resolve, reject) => {
            BeetDB.wallets_public.toArray().then((wallets) => {
                if (wallets && wallets.length > 0) {
                    let unlock;
                    let unlocked = new Promise(function (resolve) {
                        unlock = resolve
                    });
                    commit(SET_WALLET_UNLOCKED, {
                        promise: unlocked,
                        resolve: unlock
                    });
                    commit(SET_WALLET_STATUS, true);
                    commit(SET_WALLETLIST, wallets);
                    resolve('Wallets Found');
                } else {
                    resolve('Wallets not found');
                }
                resolve();
            }).catch(() => {
                reject();
            });
        });
    },
    notifyUser({
        commit
    }, payload) {
        return new Promise((resolve, reject) => {
            if (payload.notify == 'request') {
                commit(REQ_NOTIFY, payload.message);
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
    ipc: ipcRenderer,
    unlocked: {},
    isUnlocked: false
};

export default {
    namespaced: true,
    state: initialState,
    actions,
    mutations,
    getters,
};