import BlockchainAPI from "./BlockchainAPI";

import binancejs from "@binance-chain/javascript-sdk";

export default class Bitcoin extends BlockchainAPI {

    // https://github.com/steemit/steem-js/tree/master/doc#broadcast-api

    _getCoreToken() {
        return "BNB";
    }

    isConnected() {
        return this._isConnected;
    }

    connect(nodeToConnect, onClose = null) {
        return new Promise((resolve, reject) => {
            if (nodeToConnect == null) {
                nodeToConnect = this.getNodes()[0].url;
            }
            this.client = new binancejs(nodeToConnect);
            this.client.initChain();
            this._connectionEstablished(resolve, nodeToConnect);
        });
    }

    getAccount(accountname) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                this.client.getAccount(accountname).then(result => {
                    console.log(result);
                    resolve(result);
                }).catch(reject);
            }).catch(reject);
        });
    }

    _publicKeyToAddress(publicKey) {
        return binancejs.crypto.getAddressFromPublicKey(publicKey);
    }

    getPublicKey(privateKey) {
        return binancejs.crypto.getAddressFromPrivateKey(privateKey);
    }

    getBalances(accountName) {
        return new Promise((resolve, reject) => {
            this.client.getBalance(accountName).then((result) => {
                console.log(result);
                resolve(result);
            });
        });
    }

    _ensureAPI() {
        if (!this._isConnected) {
            return this.connect();
        }
        return new Promise(resolve => {
            resolve();
        });
    }

    getAccessType() {
        return "address";
    }

    getSignUpInput() {
        return {
            active: true,
            memo: null,
            owner: null
        }
    }

    sign(operation, key) {
        return new Promise((resolve, reject) => {
            reject("Not supported yet");
        });
    }

    broadcast(transaction) {
        return new Promise((resolve, reject) => {
            reject("Not supported yet");
        });
    }

    getOperation(data, account) {
        return new Promise((resolve, reject) => {
            reject("Not supported");
        });
    }

    mapOperationData(incoming) {
        return new Promise((resolve, reject) => {
            reject("Not supported");
        });
    }

    _signString(key, string) {
        let signature = binancejs.crypto.generateSignature(hash, key);
        return signature.toString("hex");
    }

    _verifyString(signature, publicKey, string) {
        return binancejs.crypto.verifySignature(signature, hash, publicKey).toString("hex") == signature;
    }

    _compareKeys(key1, key2) {
        return key1 === this._publicKeyToAddress(key2);
    }

    _verifyAccountAndKey(accountName, publicKey, permission = null) {
        return super._verifyAccountAndKey(accountName, this._publicKeyToAddress(publicKey), permission = null);
    }

}