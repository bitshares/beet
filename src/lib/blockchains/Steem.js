import steem from "steem";

export default class Steem extends BlockchainAPI {

    _onCloseWrapper(onClose) {
        this._isConnected = false;
        if (onClose) onClose();
    }

    isConnected() {
        return this._isConnected;
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
                        this._isConnected = true;
                        resolve();
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
                    this._isConnected = true;
                    resolve();
                }).catch((err) => {
                    this._isConnected = false;
                    reject(err);
                });
            }

        });
    }
}