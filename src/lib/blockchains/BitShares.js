import BlockchainAPI from "./BlockchainAPI";
import { Apis } from "bitsharesjs-ws";
import { PrivateKey } from "bitsharesjs";

export default class BitShares extends BlockchainAPI {

    _onCloseWrapper(onClose) {
        this._isConnected = false;
        if (onClose) onClose();
    }

    connect(nodeToConnect = null, onClose = null) {
        return new Promise((resolve, reject) => {
            //if (nodeToConnect == null) {
            nodeToConnect = this.getNodes()[1].url;
            //}
            if (this._isConnected) {
                Apis.close().then(() => {
                    this._isConnected = false;
                    Apis.instance(
                        nodeToConnect,
                        true,
                        10000,
                        {enableCrypto: false, enableOrders: false},
                        this._onCloseWrapper.bind(this, onClose)
                    ).init_promise.then(() => {
                        this._connectionEstablished(resolve, nodeToConnect);
                    }).catch((err) => {
                        this._isConnected = false;
                        reject(err);
                    });
                });
            } else {
                Apis.instance(
                    nodeToConnect,
                    true,
                    10000,
                    { enableCrypto: false, enableOrders: false },
                    this._onCloseWrapper.bind(this, onClose)
                ).init_promise.then(() => {
                    this._connectionEstablished(resolve, nodeToConnect);
                }).catch((err) => {
                    this._isConnected = false;
                    reject(err);
                });
            }
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

    getAccount(accountName) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(()=>{
                Apis.instance().db_api()
                    .exec("get_full_accounts", [[accountName], false])
                    .then(res => {
                        res[0][1].account.active.public_key = res[0][1].account.active.key_auths[0][0];
                        res[0][1].account.owner.public_key = res[0][1].account.owner.key_auths[0][0];
                        res[0][1].account.memo = {public_key: res[0][1].account.options.memo_key};
                        res[0][1].account.balances = res[0][1].balances;
                        resolve(res[0][1].account);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });
    }

    getBalances(accountName) {
        return new Promise((resolve, reject) => {
            this.getAccount(accountName).then((account) => {
                let neededAssets = [];
                for (let i = 0; i < account.balances.length; i++) {
                    neededAssets.push(account.balances[i].asset_type);
                }
                Apis.instance().db_api().exec("get_objects", [neededAssets]).then((assets) => {
                    let balances = [];
                    for (let i = 0; i < account.balances.length; i++) {
                        if (assets[i].issuer == "1.2.0") {
                            balances[i] = {
                                asset_type: account.balances[i].asset_type,
                                asset_name: assets[i].symbol,
                                balance: account.balances[i].balance,
                                owner: assets[i].issuer,
                                prefix: "BIT"
                            };
                        } else {
                            balances[i] = {
                                asset_type: account.balances[i].asset_type,
                                asset_name: assets[i].symbol,
                                rawbalance: assets[i].balance,
                                balance: this.formatMoney(
                                    assets[i].balance /
                                    Math.pow(10, assets[i].precision),
                                    assets[i].precision
                                ),
                                owner: assets[i].issuer,
                                prefix: ""
                            };
                        }
                    }
                    resolve(balances);
                });
            });
        });
    }

    getPublicKey(privateKey) {
        return PrivateKey.fromWif(privateKey)
            .toPublicKey()
            .toString("BTS");
    }
}