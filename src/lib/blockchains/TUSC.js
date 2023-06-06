import BitShares from "./BitShares";
//import {Apis} from "bitsharesjs-ws";

export default class TUSC extends BitShares {

    /*
    _connect(nodeToConnect = null) {
        return new Promise((resolve, reject) => {
            if (nodeToConnect == null) {
                nodeToConnect = this.getNodes()[0].url;
            }
            if (this._isConnected) {
                Apis.close().then(() => {
                    this._isConnected = false;
                    Apis.instance(
                        nodeToConnect,
                        true,
                        10000,
                        {enableCrypto: false, enableOrders: false},
                        // no use in firing reject because it might happen at any time in the future after connecting!
                        this._connectionFailed.bind(this, null, nodeToConnect, "Connection closed")
                    ).init_promise.then(() => {
                        this._connectionEstablished(resolve, nodeToConnect);
                    }).catch(this._connectionFailed.bind(this, reject, nodeToConnect));
                });
            } else {
                Apis.instance(
                    nodeToConnect,
                    true,
                    10000,
                    {enableCrypto: false, enableOrders: false},
                    // no use in firing reject because it might happen at any time in the future after connecting!
                    this._connectionFailed.bind(this, null, nodeToConnect, "Connection closed")
                ).init_promise.then(() => {
                    this._connectionEstablished(resolve, nodeToConnect);
                }).catch(this._connectionFailed.bind(this, reject, nodeToConnect));
            }
        });
    }

    _needsNewConnection() {
        if (this._isConnected) {
            // is this tusc node?
            if (Apis.instance().url.indexOf("testnet") === -1) {
                return true;
            }
        }
        return super._needsNewConnection();
    }
    */

    getAsset(assetSymbolOrId) {
        if (assetSymbolOrId == "1.3.0") {
            return {
                asset_id: "1.3.0",
                symbol: "TUSC",
                precision: 5
            };
        } else {
            return null;
        }
    }

    getExplorer(object) {
        return "https://wallet.tusc.network/wallet/explorer";
    }

}
