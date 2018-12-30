import BlockchainAPI from "./BlockchainAPI";
import { Apis } from "bitsharesjs-ws";

export default class BitShares extends BlockchainAPI {

    _onCloseWrapper(onClose) {
        this._isConnected = false;
        if (onClose) onClose();
    }

    connect(nodeToConnect, onClose = null) {
        return new Promise((resolve, reject) => {
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
}