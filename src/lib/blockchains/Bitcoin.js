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

    _connect(nodeToConnect) {
        return new Promise((resolve, reject) => {
            if (nodeToConnect == null) {
                nodeToConnect = this.getNodes()[0].url;
            }
            this._connectionEstablished(resolve, nodeToConnect);
        });
    }

    getAccount(accountname) {
        return new Promise((resolve, reject) => {
            this.ensureConnection().then(() => {
                fetch("https://blockchain.info/rawaddr/" + accountname).then(result => {
                    result.json().then(result => {
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
                        account.id = accountname;

                        account.raw = result;

                        resolve(account);
                    }).catch(reject);
                }).catch(reject);
            }).catch(reject);
        });
    }

    _publicKeyToAddress(publicKey) {
        let _bitcoin = bitcoin;
        let publicKeyBuffer = new Buffer(publicKey, 'hex')
        let keyPair = bitcoin.ECPair.fromPublicKey(publicKeyBuffer)
        const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });
        return address;
    }

    getPublicKey(privateKey) {
        const keyPair = bitcoin.ECPair.fromWIF(privateKey);
        this._lastPublicKey = keyPair.publicKey.toString("hex");
        return keyPair.publicKey.toString("hex");
    }

    getBalances(accountName) {
        return new Promise((resolve, reject) => {
            this.getAccount(accountName).then((account) => {
                let balances = [];
                balances.push({
                    asset_type: "UIA",
                    asset_name: this._getCoreToken(),
                    balance: parseFloat(account.raw.total_received - account.raw.total_sent),
                    owner: "-",
                    prefix: ""
                });
                resolve(balances);
            });
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
        let hash = bitcoin.crypto.sha256(string);
        let signature = keyPair.sign(hash);
        return signature.toString("hex");
    }

    _verifyString(signature, publicKey, string) {
        let publicKeyBuffer = new Buffer(publicKey, 'hex')
        let keyPair = bitcoin.ECPair.fromPublicKey(publicKeyBuffer)
        let hash = bitcoin.crypto.sha256(string);
        return keyPair.verify(hash, new Buffer(signature, 'hex'));
    }

    _compareKeys(key1, key2) {
        return key1 === this._publicKeyToAddress(key2);
    }

    _verifyAccountAndKey(accountName, publicKey, permission = null) {
        return super._verifyAccountAndKey(accountName, this._publicKeyToAddress(publicKey), permission = null);
    }

    async transfer(key, from, to, amount, memo = null) {
        let account = await this.getAccount(from);

        let unspent = [];
        account.raw.txs.forEach(_item => {
            _item.out.forEach(_tmp => {
                if (!_tmp.spent) {
                    unspent.push(_tmp);
                }
            });
        });

        let fee = 100;

        const txb = new bitcoin.TransactionBuilder();
        txb.setVersion(1);

        let total_unspent = 0;

        unspent.forEach(out => {
            if (total_unspent >= amount + fee) {
                return;
            }
            txb.addInput(out.script, out.n);
            total_unspent = total_unspent + out.value;
        });

        if (total_unspent < amount.amount) {
            throw {key: "insufficient_balance"};
        }

        let overspent = total_unspent - amount - fee;
        txb.addOutput(to, amount);
        if (overspent > 0) {
            txb.addOutput(to, amount);
        }

        const keyPair = bitcoin.ECPair.fromWIF(key);
        unspent.forEach((item, index) => {
            txb.sign(index, keyPair);
        });

        let hex = txb.build().toHex();

        return await fetch("https://blockchain.info/pt/pushtx",
            {
                method: 'POST',
                form: {tx: hex}
            }
        );
    }

}