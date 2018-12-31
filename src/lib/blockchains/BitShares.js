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
            if (nodeToConnect == null) {
                nodeToConnect = this.getNodes()[1].url;
            }
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

    getAccount(accountname) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(()=>{
                Apis.instance().db_api()
                    .exec("get_full_accounts", [[accountname], false])
                    .then(res => {
                        resolve(res[0][1].account);
                    })
                    .catch((err) => {
                        reject(err);
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