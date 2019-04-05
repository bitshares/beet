import BlockchainAPI from "./BlockchainAPI";

import binancejs from "@binance-chain/javascript-sdk";
const fetch = require('node-fetch');

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
            this.client.initChain().then(() => {
                console.log("Binance Chain initialized", this.client);
                this._connectionEstablished(resolve, nodeToConnect);
            }).catch(reject);
        });
    }

    getAccount(accountname) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                this.client.getAccount(accountname).then(result => {
                    if (result.status != 200) {
                        reject("HTTP status not ok");
                    }
                    result = result.result;
                    let account = {};
                    account.active = {};
                    account.owner = {};
                    //if (!!this._lastPublicKey) {
                    account.active.public_keys = [[accountname, 1]];
                    //    if (this._publicKeyToAddress(this._lastPublicKey) !== accountname) {
                    //        reject("Public key not matching");
                    //    }
                    //} else {
                    //    reject("No public key found!");
                    //}
                    account.owner.public_keys = [];
                    account.memo = {public_key: null};
                    account.id = result.account_number;
                    account.name = accountname;
                    account.balances = result.balances;
                    resolve(account);
                }).catch(reject);
            }).catch(reject);
        });
    }

    _publicKeyToAddress(publicKey) {
        return binancejs.crypto.getAddressFromPublicKey(publicKey);
    }

    getPublicKey(privateKey) {
        return binancejs.crypto.getPublicKeyFromPrivateKey(privateKey);
    }

    getBalances(accountName) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                this.client.getBalance(accountName).then((result) => {
                    let balances = [];
                    result.forEach(balance => {
                        balances.push({
                            asset_type: "UIA",
                            asset_name: balance.symbol,
                            balance: parseFloat(balance.free),
                            owner: "-",
                            prefix: ""
                        });
                    });
                    resolve(balances);
                });
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
            active: true
        }
    }

    sign(operation, key) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                if (typeof operation == "object"
                    && operation.length > 2
                    && operation[1] == "inject_wif") {
                    this.client.setPrivateKey(key).then(() => {
                        resolve(operation)
                    });
                } else {
                    reject("Unknown sign request");
                }
            }).catch(err => reject(err));
        });
    }

    broadcast(transaction) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                switch (transaction[0]) {
                    case "transfer":
                        this.client.transfer(transaction[2], transaction[3], transaction[4], transaction[5], transaction[6], transaction[7])
                            .then(resolve)
                            .catch(reject)
                            .finally(()=>{
                                this.client.privateKey = undefined;
                            });
                        break;
                    case "cancelOrder":
                        this.client.cancelOrder(transaction[2], transaction[3], transaction[4], transaction[5])
                            .then(resolve)
                            .catch(reject)
                            .finally(()=>{
                                this.client.privateKey = undefined;
                            });
                        break;
                    case "placeOrder":
                        this.client.placeOrder(transaction[2], transaction[3], transaction[4], transaction[5], transaction[6], transaction[7], transaction[8])
                            .then(resolve)
                            .catch(reject)
                            .finally(()=>{
                                this.client.privateKey = undefined;
                            });
                        break;
                }
            }).catch(reject);
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
        let signature = binancejs.crypto.generateSignature(new Buffer(string).toString("hex"), key);
        return signature.toString("hex");
    }

    _verifyString(signature, publicKey, string) {
        return binancejs.crypto.verifySignature(signature, new Buffer(string).toString("hex"), publicKey);
    }

    _compareKeys(key1, key2) {
        return key1 === this._publicKeyToAddress(key2);
    }

    _verifyAccountAndKey(accountName, publicKey, permission = null) {
        return super._verifyAccountAndKey(accountName, this._publicKeyToAddress(publicKey), permission = null);
    }

    async transfer(key, from, to, amount, memo = null) {
        if (!amount.amount || !amount.asset_id) {
            throw "Amount must be a dict with amount and asset_id as keys"
        }
        from = await this.getAccount(from);
        to = await this.getAccount(to);

        const api = 'https://testnet-dex.binance.org/';
        const sequenceURL = `${api}api/v1/account/${from.name}/sequence`;

        if (memo == null){
            memo = "";
        }

        let result = await fetch(sequenceURL);
        result = await result.json();
        const sequence = (!!result.data ? result.data.sequence : false) || 0;
        let transaction = await this.sign(["transfer", "inject_wif", from.name, to.name, amount.amount, amount.asset_id, memo, sequence], key);
        return await this.broadcast(transaction);
    }

}