import SecureLS from "secure-ls";

const GET_WALLET = 'GET_WALLET';
const SET_WALLET_STATUS = 'SET_WALLET_STATUS';
const SET_WALLETLIST = 'SET_WALLETLIST';

const wallet = {};

const mutations = {
    [GET_WALLET](state,wallet
    ) {
    
        state.wallet = wallet;
    },
    
    [SET_WALLET_STATUS](state,status) {
    
        state.hasWallet = status;
    },
    
    [SET_WALLETLIST](state,walletlist) {
    
        state.walletlist = walletlist;
    }
};

const actions = {
    getWallet({commit}, payload) {
        return new Promise((resolve, reject) => {
            let ls = new SecureLS({
                encodingType: "aes",
                isCompression: true,
                encryptionSecret: payload.wallet_pass
            });
            try {
                let wallet = ls.get(payload.wallet_id);
                commit(GET_WALLET,wallet);
                resolve();
            } catch (e) {
                reject();
            }
        });
    },
    loadWallets({commit}) {
       
        return new Promise((resolve, reject) => {
            let wallets = JSON.parse(localStorage.getItem("wallets"));
            if (wallets && wallets.length > 0) {
                commit(SET_WALLET_STATUS,true);
                commit(SET_WALLETLIST,wallets);
                resolve();
            }else{
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
    wallet: {},
    hasWallet: false,
    walletlist: []
};

export default {
    namespaced: true,
    state: initialState,
    actions,
    mutations,
    getters,
};