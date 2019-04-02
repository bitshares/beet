import {EventBus} from '../event-bus.js';
import RendererLogger from "../RendererLogger";
const logger = new RendererLogger();

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
        EventBus.$emit('blockchainStatus', { chain: this._config.short , status:true});
        this._isConnectingInProgress = false;
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

    getAccessType() {
        return "account";
    }

    getSignUpInput() {
        return {
            active: true,
            memo: true,
            owner: false
        }
    }

    signMessage(key, accountName, randomString) {
        return new Promise((resolve,reject) => {
            // do as a list, to preserve order
            let message = [
                "from",
                accountName,
                "key",
                this.getPublicKey(key),
                "time",
                new Date().toUTCString(),
                "text",
                randomString
            ];
            if (this._config.short !== message[2].substring(0, 3)) {
                message.push("chain");
                message.push(this._config.short);
            }
            message = JSON.stringify(message);
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

    _compareKeys(key1, key2) {
        return key1 === key2;
    }

    async verifyAccount(accountName, credentials) {
        let account = await this.getAccount(accountName);
        let required = this.getSignUpInput();
        Object.keys(required).forEach(key => {
            let given = credentials[key];
            let mandatory = required[key];
            if (!!mandatory) {
                // mandatory == null means this authority is not used in this blockchain
                if (!given) {
                    throw "Authority (" + key + ") is mandatory, but not given by user";
                }
                let publicKey = null;
                try {
                    publicKey = this.getPublicKey(given);
                } catch (err) {
                    throw {key: "invalid_key_error"};
                }
                let found = false;
                if (!!account[key].public_keys) {
                    account[key].public_keys.forEach(key => {
                        if (this._compareKeys(key[0], publicKey)) {
                            found = true;
                        }
                    });
                } else {
                    found = this._compareKeys(account[key].public_key, publicKey);
                }
                if (!found) {
                    throw {key: "unverified_account_error"};
                }
            }
        });
        return account;
    }

}
