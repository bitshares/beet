export default class BlockchainAPI {

    constructor(config) {
        this._config = config;
        this._isConnected = false;
        this._isConnectingInProgress = false;
    }

    isConnected() {
        return this._isConnected;
    }

    connect(nodeToConnect, onClose, onError) {
        throw "Needs implementation";
    }

    _connectionEstablished(resolveCallback, node) {
        this._isConnected = true;
        this._isConnectingInProgress = false;
        console.log("connected to ", node)
        resolveCallback(node);
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

    sign(incoming, key) {
        throw "Needs implementation";
    }

    broadcast(transaction) {
        throw "Needs implementation";
    }

    signMessage(key, message) {
        throw "Needs implementation";
    }

}
