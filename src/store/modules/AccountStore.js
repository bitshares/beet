import aes from "crypto-js/aes.js";
import RendererLogger from "../../lib/RendererLogger";

const logger = new RendererLogger();
const LOAD_ACCOUNTS = 'LOAD_ACCOUNTS';
const CHOOSE_ACCOUNT = 'CHOOSE_ACCOUNT';
const ADD_ACCOUNT = 'ADD_ACCOUNT';
const CLEAR_ACCOUNTS = 'CLEAR_ACCOUNTS';

const mutations = {
    [LOAD_ACCOUNTS](state, accounts) {
        state.accountlist = accounts;
        state.selectedIndex = 0;
    },
    [CHOOSE_ACCOUNT](state, accountIndex) {
        state.selectedIndex = accountIndex;
    },
    [ADD_ACCOUNT](state, account) {
        state.accountlist.push(account);
        state.selectedIndex = state.accountlist.length - 1;
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
                if (payload.account.chain == state.accountlist[i].chain && payload.account.accountID == state.accountlist[i].accountID) {
                    reject('Account already exists');
                }
            }

            for (let keytype in payload.account.keys) {
                payload.account.keys[keytype] = aes.encrypt(payload.account.keys[keytype], payload.password).toString();
            }

            dispatch('WalletStore/saveAccountToWallet', payload, {
                root: true
            }).then(() => {
                commit(ADD_ACCOUNT, payload.account);
                resolve('Account added');
            }).catch((error) => {
                reject(error);
            });
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

            if (index != -1) {
                commit(CHOOSE_ACCOUNT, index);
                resolve('Account found');
            }
        });
    }
}

const getters = {
    getAccount: state => state.accountlist[state.selectedIndex],
    getAccountList: state => state.accountlist,
    getSafeAccountList: state => state.accountlist.map(account => {
      return {
        accountID: account.accountID,
        accountName: account.accountName,
        chain: account.chain
      };
    }),
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
    accountlist: []
};

export default {
    namespaced: true,
    state: initialState,
    actions,
    mutations,
    getters,
};
