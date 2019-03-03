import BlockchainAPI from "./BlockchainAPI";
import RendererLogger from "../RendererLogger";
const logger = new RendererLogger();

const fetch = require('node-fetch');

import bitcoin from "bitcoinjs-lib";

export default class Bitcoin extends BlockchainAPI {

    // https://github.com/steemit/steem-js/tree/master/doc#broadcast-api

    _getCoreToken() {
        return "BTC";
    }

    isConnected() {
        return this._isConnected;
    }

    connect(nodeToConnect, onClose = null) {
        return new Promise((resolve, reject) => {
            if (nodeToConnect == null) {
                nodeToConnect = this.getNodes()[0].url;
            }
            this._connectionEstablished(resolve, nodeToConnect);
        });
    }

    getAccount(accountname) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(result => {
                fetch({
                    method: 'GET',
                    url: 'https://blockchain.info/rawaddr/' + accountname
                }, function (err, result) {
                    if (err) reject(err);

                    account.active = {}
                    account.owner = {}
                    account.active.public_keys = [[accountname, 1]];
                    account.owner.public_keys = [];
                    account.memo = {public_key: ""};
                    account.id = accountname;

                    account.n_tx = result.n_tx;
                    account.total_received = result.total_received;
                    account.total_sent = result.total_sent;

                    resolve(account);
                })
            }).catch(reject);
        });
    }

    getPublicKey(privateKey) {
        const keyPair = bitcoin.ECPair.fromWIF(privateKey);
        return keyPair.publicKey;
    }

    getBalances(accountName) {
        return new Promise((resolve, reject) => {
            this.getAccount(accountName).then((account) => {
                let balances = [];
                balances.push({
                    asset_type: "UIA",
                    asset_name: this._getCoreToken(),
                    balance: parseFloat(account.total_received - account.total_sent),
                    owner: "-",
                    prefix: ""
                });
                resolve(balances);
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
        const keyPair = bitcoin.ECPair.fromWIF(key);
        console.log(keyPair);
        let signature = keyPair.sign(string);
        console.log(signature);
        return signature.toString();
    }

    _verifyString(signature, publicKey, string) {
        const keyPair = bitcoin.ECPair.fromPublicKey(Buffer.from(publicKey, 'hex'));
        return keyPair.verify(string, signature);
    }

}