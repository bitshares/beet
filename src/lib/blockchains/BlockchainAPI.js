import {EventBus} from '../event-bus.js';
import RendererLogger from "../RendererLogger";
const logger = new RendererLogger();

import store from "../../store";
import {formatAsset, humanReadableFloat} from "../assetUtils";

export default class BlockchainAPI {

    constructor(config) {
        this._config = config;
        this._isConnected = false;
        this._isConnectingInProgress = false;
        this._isConnectedToNode = null;
    }

    isConnected() {
        return this._isConnected;
    }

    ensureConnection(nodeToConnect = null) {
        if (nodeToConnect != null && this._isConnectedToNode !== nodeToConnect) {
            // enforce connection to that node
            this._isConnected = false;
        }
        return new Promise((resolve,reject) => {
            if (!this._isConnected) {
                if (this._isConnectingInProgress) {
                    // there should be a promise queue for pending connects, this is the lazy way
                    setTimeout(() => {
                        if (this._isConnected) {
                            this._connectionEstablished(resolve, nodeToConnect);
                        } else {
                            this._connectionFailed(reject, nodeToConnect, "multiple connects, did not resolve in time");
                        }
                    }, 2000);
                    return;
                }
                this._isConnectingInProgress = true;
                EventBus.$emit(
                    'blockchainStatus',
                    {
                        chain: this._config.identifier,
                        status: this._isConnected,
                        connecting: this._isConnectingInProgress
                    }
                );
                this._connect(nodeToConnect).then(resolve).catch(reject);
            } else {
                resolve();
            }
        });
    }

    _connect(nodeToConnect) {
        throw "Needs implementation";
    }

    _connectionEstablished(resolveCallback, node) {
        this._isConnectedToNode = node;
        this._isConnected = true;
        this._isConnectingInProgress = false;
        EventBus.$emit(
            'blockchainStatus',
            {
                chain: this._config.identifier,
                status: this._isConnected,
                connecting: this._isConnectingInProgress
            }
        );
        store.dispatch("SettingsStore/setNode", {
            chain: this._config.identifier,
            node: node
        });
        resolveCallback(node);
    }

    _connectionFailed(resolveCallback, node, error) {
        logger.debug(this._config.identifier + "._connectionFailed", error);
        this._isConnected = false;
        this._isConnectingInProgress = false;
        EventBus.$emit(
            'blockchainStatus',
            {
                chain: this._config.identifier,
                status: this._isConnected,
                connecting: this._isConnectingInProgress,
                error: error
            }
        );
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
            if (this._config.identifier !== message[2].substring(0, 3)) {
                message.push("chain");
                message.push(this._config.identifier);
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
            this._verifyAccountAndKey(signedMessage.payload[1], signedMessage.payload[3]).then(
                found => {
                    if (found.account == null) {
                        reject("invalid user");
                    }
                    // verify message signed
                    let verified = false;
                    try {
                        verified = this._verifyString(signedMessage.signature, signedMessage.payload[3], signedMessage.signed);
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
            if (mandatory) {
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
                if (account[key].public_keys) {
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

    transfer(key, from, to, amount, asset, memo = null, broadcast = true) {
        throw "Needs implementation!"
    }

    supportsFeeCalculation() {
        return false;
    }

    getAsset(assetSymbolOrId) {
        throw "Needs implementation!";
    }

    format(amount) {
        let asset = null;
        if (typeof amount.asset_id == "string" && amount.asset_id.substring(0,1) == "1") {
            asset = this.getAsset(amount.asset_id);
        } else if (Number.isInteger(amount.asset_id)) {
            asset = this.getAsset(amount.asset_id);
        }
        if (asset == null) {
            return formatAsset(amount.satoshis, amount.asset_id);
        } else {
            return formatAsset(amount.satoshis, asset.symbol, asset.precision);
        }
    }

    getExplorer(account) {
        return false;
    }

}
