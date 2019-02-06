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

    _signString(key, string) {
        throw "Needs implementation";
    }

    signMessage(key, accountName, randomString) {
        return new Promise((resolve,reject) => {
            // do as a list, to preserve order
            let message = JSON.stringify([
                "from",
                accountName,
                this.getPublicKey(key),
                "time",
                new Date().toUTCString(),
                "text",
                randomString
            ]);
            try {

                resolve({
                    signed: message,
                    payload: JSON.parse(message),
                    signature: this._signString(key, message)
                });
            } catch (err) {
                reject(err);
            }
        });
    }


    verifyMessage(signedMessage) {
        return new Promise((resolve, reject) => {
            if (typeof signedMessage.payload === "string" || signedMessage.payload instanceof String) {
                signedMessage.signed = signedMessage.payload;
                signedMessage.payload = JSON.parse(signedMessage.payload);
            }

            // validate account and key
            this._verifyAccountAndKey(signedMessage.payload[1], signedMessage.payload[2]).then(
                found => {
                    if (found.account == null) {
                        reject("invalid user");
                    }
                    // verify message signed
                    let verified = false;
                    try {
                        verified = this._verifyString(signedMessage.signature, signedMessage.payload[2], signedMessage.signed);
                    } catch (err) {
                        // wrap message that could be raised from Signature
                        reject("Error verifying signature");
                    }
                    if (!verified) {
                        reject("Invalid signature");
                    }
                    return resolve(signedMessage);
                }
            ).catch(err => {
                reject(err);
            });
        });
    }

    _verifyString(signature, publicKey, string) {
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
