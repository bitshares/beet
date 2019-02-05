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

    verifyMessage(message) {
        throw "Needs implementation";
    }

    _verifyAccountAndKey(accountName, publicKey, permission = null) {
        return new Promise((resolve, reject) => {
            this.getAccount(accountName).then(account => {
                account.active.public_keys.forEach((key) => {
                    if (key[0] == publicKey) {
                        resolve({
                            account: account,
                            permission: "active",
                            weight: key[1]
                        });
                        return;
                    }
                });
                account.owner.public_keys.forEach((key) => {
                    if (key[0] == publicKey) {
                        resolve({
                            account: account,
                            permission: "owner",
                            weight: key[1]
                        });
                        return;
                    }
                });
                if (account.memo.public_key == publicKey) {
                    resolve({
                        account: account,
                        permission: "memo",
                        weight: 1
                    });
                    return;
                }
                reject("Key and account do not match!")
            }).catch((err) => {
                reject(err)
            });
        });
    }

}
