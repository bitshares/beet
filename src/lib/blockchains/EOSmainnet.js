import BlockchainAPI from "./BlockchainAPI";
import RendererLogger from "../RendererLogger";
const logger = new RendererLogger();

const fetch = require('node-fetch');

const { Api, JsonRpc, RpcError } = require('eosjs');
import * as ecc from "eosjs-ecc";
import { convertLegacyPublicKey } from "eosjs/dist/eosjs-numeric";

export default class EOS extends BlockchainAPI {

    // https://github.com/steemit/steem-js/tree/master/doc#broadcast-api

    _getCoreToken() {
        return "EOS";
    }

    isConnected() {
        return this._isConnected;
    }

    connect(nodeToConnect, onClose = null) {
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
            this._ensureAPI().then(result => {
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
        return ecc.Signature.sign(new Buffer(string), key).toHex();
    }

    _verifyString(signature, publicKey, string) {
        return ecc.Signature.fromHex(signature).verify(
            string,
            ecc.PublicKey.fromString(publicKey)
        );
    }

}