export default class BlockchainAPI {

    constructor(config) {
        this._config = config;
        this._isConnected = false;
    }

    isConnected() {
        return this._isConnected;
    }

    connect(nodeToConnect, onClose, onError) {
        return new Promise((resolve) => resolve());
    }

    _connectionEstablished(resolveCallback, node) {
        this._isConnected = true;
        console.log("connected to ", node)
        resolveCallback();
    }

    getNodes() {
        return this._config.nodeList;
    }

    getAccount() {
        throw "Needs implementation"
    }

    verifyPrivateKey(key) {
        throw "Needs implementation"
    }

}
