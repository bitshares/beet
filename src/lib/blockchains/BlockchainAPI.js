export default class BlockchainAPI {

    constructor(config) {
        this._config = config;
        this._isConnected = false;
    }

    isConnected() {
        return this._isConnected;
    }

    connect(nodeToConnect, onClose, onError) {
        throw "Needs implementation";
    }

    _connectionEstablished(resolveCallback, node) {
        this._isConnected = true;
        console.log("connected to ", node)
        resolveCallback();
    }

    getNodes() {
        return this._config.nodeList;
    }

    getAccount(accountName) {
        throw "Needs implementation";
    }

    getBalances(accountName) {
        throw "Needs implmenetation";
    }

    getPublicKey(privateKey) {
        throw "Needs implementation";
    }

    getOperation(data, account_id) {
        throw "Needs implementation";
    }

}
