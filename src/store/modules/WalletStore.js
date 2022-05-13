import {ipcRenderer} from 'electron';
import {v4 as uuid} from "uuid";
import sha512 from "crypto-js/sha512.js";
import aes from "crypto-js/aes.js";
import ENC from 'crypto-js/enc-utf8.js';

import BeetDB from '../../lib/BeetDB.js';
import RendererLogger from "../../lib/RendererLogger";
const logger = new RendererLogger();

const GET_WALLET = 'GET_WALLET';
const CREATE_WALLET = 'CREATE_WALLET';
const CONFIRM_UNLOCK = 'CONFIRM_UNLOCK';
const SET_WALLET_STATUS = 'SET_WALLET_STATUS';
const SET_WALLET_UNLOCKED = 'SET_WALLET_UNLOCKED';
const SET_WALLETLIST = 'SET_WALLETLIST';
const REQ_NOTIFY = 'REQ_NOTIFY';
const CLOSE_WALLET = 'CLOSE_WALLET';

const wallet = {};

const mutations = {
    [GET_WALLET](state, wallet) {
        state.wallet = wallet;
    },
    [CONFIRM_UNLOCK](state) {
        state.unlocked.resolve();
        state.isUnlocked = true;
    },
    [CLOSE_WALLET](state) {
        state.wallet = {};
        state.hasWallet = false;
        state.walletlist = [];
        state.unlocked = {};
        state.isUnlocked = false;
        ipcRenderer.send('seeding',  '');
    },
    [SET_WALLET_STATUS](state, status) {
        state.hasWallet = status;
    },
    [SET_WALLET_UNLOCKED](state, unlocked) {
        state.unlocked = unlocked;
    },
    [SET_WALLETLIST](state, walletlist) {
        state.walletlist = walletlist;
    },
    [REQ_NOTIFY](state, notify) {
        state.ipc.send("notify", notify);
    },
    [CREATE_WALLET](state, wallet) {
        state.wallet = wallet;
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
                    let bytes = aes.decrypt(wallet.data, payload.wallet_pass);
                    let decrypted_wallet = JSON.parse(bytes.toString(ENC));
                    let public_wallets = state.walletlist.filter((x) => {
                        return x.id == payload.wallet_id
                    });

                    commit(GET_WALLET, public_wallets[0]);
                    let accountlist = decrypted_wallet;
                    ipcRenderer.send('seeding', sha512(payload.wallet_pass).toString());
                    dispatch('AccountStore/loadAccounts', accountlist, {
                        root: true
                    });
                    resolve();
            }).catch((e) => {
                reject(e);
            });
        });
    },
    confirmUnlock({
        commit
    }) {
        console.log('Unlocked wallet!');
        commit(CONFIRM_UNLOCK);
    },
    restoreWallet({
        commit,
        dispatch
    }, payload) {
        return new Promise((resolve, reject) => {

            //let wallets = localStorage.getItem("wallets");
            let walletid = uuid();
            let newwallet = {
                id: walletid,
                name: payload.backup.wallet,
                chain: '',
                accounts: payload.backup.accounts.map(x=> x.accountID)
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

                    let walletdata = aes.encrypt(
                                      JSON.stringify(payload.backup.accounts),
                                      sha512(payload.password).toString()
                                    ).toString();

                    BeetDB.wallets_encrypted.put({
                        id: walletid,
                        data: walletdata
                    });

                    ipcRenderer.send('seeding', sha512(payload.password).toString());
                    commit(GET_WALLET, newwallet);
                    dispatch('AccountStore/loadAccounts', payload.backup.walletdata, {
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
                accounts: [{ accountID: payload.walletdata.accountID, chain: payload.walletdata.chain}]
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

                    for (let keytype in payload.walletdata.keys) {
                        try {
                            payload.walletdata.keys[keytype] = aes.encrypt(payload.walletdata.keys[keytype], sha512(payload.password).toString()).toString();
                        } catch (e) {
                            reject('Wrong Password');
                        }
                    }
                    let walletdata = aes.encrypt(JSON.stringify([payload.walletdata]), sha512(payload.password).toString()).toString();
                    BeetDB.wallets_encrypted.put({
                        id: walletid,
                        data: walletdata
                    });
                    ipcRenderer.send('seeding', sha512(payload.password).toString());
                    commit(GET_WALLET, newwallet);
                    dispatch('AccountStore/loadAccounts', [payload.walletdata], {
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
        return new Promise(async (resolve, reject) => {
            let walletdata =  rootState.AccountStore.accountlist.slice();
            let newwalletdata=walletdata;
            newwalletdata.push(payload.account);
            await BeetDB.wallets_encrypted.get({
                id: state.wallet.id
            }).then((wallet) => {
                try {
                    let bytes = aes.decrypt(wallet.data, sha512(payload.password).toString());
                    JSON.parse(bytes.toString(ENC));
                } catch (e) {
                    throw ('invalid');
                }
                let encwalletdata = aes.encrypt(JSON.stringify(newwalletdata), sha512(payload.password).toString()).toString();
                let updatedWallet = Object.assign({}, state.wallet);
                updatedWallet.accounts.push({ accountID: payload.account.accountID, chain: payload.account.chain});

                BeetDB.wallets_encrypted.update(updatedWallet.id, {
                    data: encwalletdata
                }).then(() => {
                    BeetDB.wallets_public.update(updatedWallet.id, {
                        accounts: updatedWallet.accounts
                    }).then(() => {
                        commit(GET_WALLET, updatedWallet);
                        resolve('Account saved');
                    }).catch(() => {
                        reject('update_failed');
                    });
                }).catch((e) => {
                    reject(e);
                });
            }).catch((e) => {
                reject(e);
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
    },
    logout({
        commit,
        dispatch
    }) {
        return new Promise((resolve,reject)=> {
            commit(CLOSE_WALLET);
            dispatch('AccountStore/logout', {}, {
                root: true
            });
            resolve();
        });
    }
}


const getters = {
    getWallet: state => state.wallet,
    getWalletName: state => state.wallet.name,
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
