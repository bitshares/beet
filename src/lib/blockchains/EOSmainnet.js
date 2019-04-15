import BlockchainAPI from "./BlockchainAPI";
import RendererLogger from "../RendererLogger";
const logger = new RendererLogger();

const fetch = require('node-fetch');

const { Api, JsonRpc, RpcError } = require('eosjs');
import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig";

import * as ecc from "eosjs-ecc";
import { TextEncoder, TextDecoder } from "util";

export default class EOS extends BlockchainAPI {

    // https://github.com/steemit/steem-js/tree/master/doc#broadcast-api

    _getCoreToken() {
        return "EOS";
    }

    _connect(nodeToConnect) {
        return new Promise((resolve, reject) => {
            if (nodeToConnect == null) {
                nodeToConnect = this.getNodes()[0].url;
            }
            if (!this.rpc) {
                this.rpc = new JsonRpc(nodeToConnect, {fetch});
            }
            this._connectionEstablished(resolve, nodeToConnect);
        });
    }

    getAccount(accountname) {
        return new Promise((resolve, reject) => {
            this.ensureConnection().then(result => {
                this.rpc.get_account(accountname).then(account => {
                    account.active = {}
                    account.owner = {}
                    account.active.public_keys = account.permissions.find(
                        res => { return res.perm_name == "active" }).required_auth.keys.map(item => [item.key, item.weight]);
                    account.owner.public_keys = account.permissions.find(
                        res => { return res.perm_name == "owner" }).required_auth.keys.map(item => [item.key, item.weight]);
                    account.memo = {public_key: account.active.public_keys[0][0]};
                    account.id = account.account_name;
                    resolve(account);
                }).catch(reject);
            }).catch(reject);
        });
    }

    getPublicKey(privateKey) { // convertLegacyPublicKey
        return ecc.PrivateKey.fromString(privateKey).toPublic().toString();
    }

    getBalances(accountName) {
        return new Promise((resolve, reject) => {
            this.getAccount(accountName).then((account) => {
                let balances = [];
                balances.push({
                    asset_type: "UIA",
                    asset_name: this._getCoreToken(),
                    balance: parseFloat(account.core_liquid_balance),
                    owner: "-",
                    prefix: ""
                });
                balances.push({
                    asset_type: "UIA",
                    asset_name: "CPU Stake",
                    balance: parseFloat(account.total_resources.cpu_weight),
                    owner: "-",
                    prefix: ""
                });
                balances.push({
                    asset_type: "UIA",
                    asset_name: "Bandwith Stake",
                    balance: parseFloat(account.total_resources.net_weight),
                    owner: "-",
                    prefix: ""
                });
                resolve(balances);
            });
        });
    }

    sign(transaction, key) {
        return new Promise((resolve, reject) => {
            transaction.signatureProvider = new JsSignatureProvider([key]);
            resolve(transaction);
        });
    }

    broadcast(transaction) {
        return new Promise((resolve, reject) => {
            const api = new Api({
                rpc: this.rpc,
                signatureProvider: transaction.signatureProvider,
                textDecoder: new TextDecoder(),
                textEncoder: new TextEncoder()
            });
            api.transact(
                {
                    actions: transaction.actions
                },
                {
                    blocksBehind: 3,
                    expireSeconds: 30

                }
            ).then(result => {
                  resolve(result);
            }).catch(reject);
        });
    }

    getOperation(data, account) {
        // https://eosio.stackexchange.com/questions/212/where-is-the-api-for-block-producer-voting-in-eosjs
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
        return ecc.Signature.sign(new Buffer(string), key).toHex();
    }

    _verifyString(signature, publicKey, string) {
        return ecc.Signature.fromHex(signature).verify(
            string,
            ecc.PublicKey.fromString(publicKey)
        );
    }

    async transfer(key, from, to, amount, memo = null) {
        if (!amount.amount || !amount.asset_id) {
            throw "Amount must be a dict with amount and asset_id as keys"
        }
        from = await this.getAccount(from);
        to = await this.getAccount(to);

        if (memo == null) {
            memo = "";
        }

        if (amount.asset_id !== "EOS") {
            throw "Only EOS supported at the moment."
        }

        let actions = [{
            account: 'eosio.token',
            name: 'transfer',
            authorization: [{
                actor: from.id,
                permission: 'active',
            }],
            data: {
                from: from.id,
                to: to.id,
                quantity: (amount.amount/10000).toFixed(4) + " " + amount.asset_id,
                memo: memo,
            },
        }];

        let transaction = {
            actions
        };
        let signedTransaction = await this.sign(transaction, key);
        let result = await this.broadcast(signedTransaction);
        return result;
    }

    getExplorer(object) {
        if (object.accountName) {
            return "https://bloks.io/account/" + object.accountName;
        } else if (object.txid) {
            // 4e0d513db2b03e7a5cdee0c4b5b8096af33fba08fcf2b7c4b05ab8980ae4ffc6
            return "https://bloks.io/transaction/" + object.txid;
        } else {
            return false;
        }

    }

}
