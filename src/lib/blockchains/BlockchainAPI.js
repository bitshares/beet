import store from "../../store";
import {formatAsset, humanReadableFloat} from "../assetUtils";
import RendererLogger from "../RendererLogger";
import * as Actions from '../Actions';

const logger = new RendererLogger();

import mitt from 'mitt';
const emitter = mitt();

export default class BlockchainAPI {

    constructor(config, initNode) {
        this._tempBanned = [];
        this._config = config;
        this._node = initNode;
        this._isConnected = false;
        this._isConnectingInProgress = false;
        this._isConnectedToNode = null;
        this._blockedAddresses = [];
    }

    /*
     * Ensure blockchain connection exists, if it doesn't make one.
     * @param {String||Null} nodeToConnect
     * @returns {Promise} connection
     */
    async ensureConnection(nodeToConnect = null) {
        return new Promise(async (resolve, reject) => {
            if (nodeToConnect && this._isConnectedToNode !== nodeToConnect) {
                // enforce connection to that node
                this._isConnected = false;
                this._isConnectedToNode = null;
            }

            let badConnection = await this._needsNewConnection();
            if (!nodeToConnect && !badConnection) {
                console.log(`Using existing connection: ${this._isConnectedToNode}`);
                return this._connectionEstablished(resolve, this._isConnectedToNode);
            }

            if (this._isConnectingInProgress) {
                // there should be a promise queue for pending connects, this is the lazy way
                console.log("Queued connection - existing connection handshake in progress.");
                setTimeout(() => {
                    if (this._isConnected) {
                        this._connectionEstablished(resolve, this._node);
                    } else {
                        this._connectionFailed(
                          reject,
                          this._node,
                          "Timeout"
                        );
                    }
                }, 4000);
                return;
            } else {
                this._isConnectingInProgress = true;
            }

            this._connect(nodeToConnect).then((res) => {
                this._isConnectingInProgress = false;
                this._isConnected = true;
                return resolve(res);
            }).catch((error) => {
                console.log(error);
                return reject(error);
            });
        });
    }

    /*
     * Triggers upon successful blockchain node connection. Stores successful changes.
     * @param {callback} resolveCallback
     * @param {String} node
     * @returns {String} node
     */
    _connectionEstablished(resolveCallback, node) {
        this._isConnectedToNode = node;
        this._isConnected = true;
        this._isConnectingInProgress = false;
        store.dispatch("SettingsStore/setNode", {
            chain: this._config.identifier,
            node: node
        });
        resolveCallback(node);
    }

    /*
     * Triggers upon blockchain node connection failure. Logs and changes connection states.
     * @param {callback} resolveCallback
     * @param {String} node
     * @returns {String} node
     */
    _connectionFailed(resolveCallback, node, error) {
        logger.debug(this._config.name + " Failed to connect to " + node, error);
        console.log(this._config.name + " Failed to connect to " + node, error);
        this._tempBanned.push(node);
        this._isConnected = false;
        this._isConnectingInProgress = false;
        if (resolveCallback != null) {
            resolveCallback(node);
        }
    }

    /*
     * Signing a string with a key
     * @param {string} key
     * @param {String} accountName
     * @param {String} messageText
     * @returns {Promise}
     */
    signMessage(key, accountName, messageText) {
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
                messageText
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

    /*
     * Verifying a signed message
     * @param {Object} signedMessage
     * @returns {Promise}
     */
    verifyMessage(signedMessage) {
        return new Promise((resolve, reject) => {
            if (typeof signedMessage.payload.params === "string" || signedMessage.payload.params instanceof String) {
                signedMessage.payload.params = JSON.parse(signedMessage.payload.params);
            }
            // parse payload
            let payload_dict = {};
            let payload_list = signedMessage.payload.params.payload;
            if (payload_list[2] == "key") {
                for (let i = 0; i < payload_list.length - 1; i = i+2) {
                    payload_dict[payload_list[i]] = payload_list[i + 1];
                }
            } else {
                for (let i = 3; i < payload_list.length - 1; i = i+2) {
                    payload_dict[payload_list[i]] = payload_list[i + 1];
                }
                payload_dict.key = payload_list[2];
                payload_dict.from = payload_list[1];
            }

            // validate account and key
            this._verifyAccountAndKey(payload_dict.from, payload_dict.key).then(
                found => {
                    if (found.account == null) {
                        reject("invalid user");
                    }
                    // verify message signed

                    let signedParams = signedMessage.payload.params;

                    let signature;
                    try {
                      signature = signedParams.signature;
                    } catch (error) {
                      console.log(error);
                    }

                    let signed;
                    try {
                      signed = signedParams.signed;
                    } catch (error) {
                      console.log(error);
                    }

                    let verified;
                    try {
                        verified = this._verifyString(
                          signature,
                          payload_dict.key,
                          signed
                        );
                    } catch (err) {
                        // wrap message that could be raised from Signature
                        reject("Error verifying signature", err);
                    }
                    if (!verified) {
                        reject("Invalid signature");
                    }
                    return resolve({result: verified});
                }
            ).catch(err => {
                reject(err);
            });
        });
    }

    /*
     * Verify provided publicKey matches the blockchain fetched accoutName publicKey
     * @param {String} accountName
     * @param {String} publicKey
     * @param {string} permission // Not used at all in the default blockchain function
     * @returns {Object}
     */
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

    /*
     * Verify the two blockchain keys are identical
     * @param {Object} key1
     * @param {Object} key2
     * @returns {Boolean}
     */
    _compareKeys(key1, key2) {
        return key1 === key2;
    }

    /*
     * Verify an account name against provided credentials
     * @param {String} accountName
     * @param {Object} credentials
     * @returns {Boolean}
     */
    async verifyAccount(accountName, credentials) {
        let account;
        try {
          account = await this.getAccount(accountName);
        } catch (error) {
          console.log(`getAccount: ${error}`);
          return;
        }

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
                } catch (error) {
                    console.log(error)
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

    /*
     * Prettifying amounts of crypto for display
     * @params {Object} amount
     * @returns {String}
     */
    async format(amount) {
        let asset = null;
        if (
            typeof amount.asset_id == "string" && amount.asset_id.substring(0,1) == "1"
            || (Number.isInteger(amount.asset_id))
        ) {
            return this.getAsset(amount.asset_id).then((asset) => {
                return !asset || asset == null
                    ? formatAsset(amount.satoshis, amount.asset_id)
                    : formatAsset(amount.satoshis, asset.symbol, asset.precision)
            });
        }

        return formatAsset(amount.satoshis, amount.asset_id);
    }

    /*
     * Check if there is an active blockchain connection
     * @returns {Boolean}
     */
    isConnected() {
        return this._isConnected;
    }

    /*
     * Check if the current blockchain is a test network
     * @returns {Boolean}
     */
    _isTestnet() {
        return !!this._config.testnet;
    }

    /*
     * Returns the core blockchain symbol (e.g. BTS)
     * @returns {String}
     */
    _getCoreSymbol() {
        return this._config.coreSymbol;
    }

    /*
     * Returns an array of default import options
     * @returns {Array}
     */
    getImportOptions() {
        return [
            {
                type: "ImportKeys",
                translate_key: "import_keys"
            }
        ];
    }

    /*
     * Returns a list of nodes for the current blockchain
     * @returns {Array}
     */
    getNodes() {
        return this._config.nodeList;
    }

    /*
     * Placeholder for retrieving
     * @returns {String}
     */
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

    /*
     * Placeholder for blockchain specific reconnection
     * @returns {Boolean} connection
     */
    _needsNewConnection() {
        return false;
    }

    /**
     * Returning the list of injectable operations
     * @returns {Array}
     */
     getOperationTypes() {
        return [
            {
                id: Actions.GET_ACCOUNT,
                from: '',
                method: Actions.GET_ACCOUNT
            },
            {
                id: Actions.REQUEST_SIGNATURE,
                from: '',
                method: Actions.REQUEST_SIGNATURE
            },
            {
                id: Actions.INJECTED_CALL,
                from: '',
                method: Actions.INJECTED_CALL
            },
            {
                id: Actions.VOTE_FOR,
                from: '',
                method: Actions.VOTE_FOR
            },
            {
                id: Actions.SIGN_MESSAGE,
                from: '',
                method: Actions.SIGN_MESSAGE
            },
            {
                id: Actions.SIGN_NFT,
                from: '',
                method: Actions.SIGN_NFT
            },
            {
                id: Actions.VERIFY_MESSAGE,
                from: '',
                method: Actions.VERIFY_MESSAGE
            },
            {
                id: Actions.TRANSFER,
                from: '',
                method: Actions.TRANSFER
            }
        ];
    }

    /**
     * Placeholder for blockchain specific QR code processing
     * @param {Object} contents 
     */
    handleQR(contents) {
        throw "Needs implementation";
    }

    /**
     * Placeholder for blockchain TOTP implementation
     * @returns Boolean
     */
    supportsTOTP() {
        return false;
    }

    /**
     * Placeholder for blockchain QR implementation
     * @returns Boolean
     */
    supportsQR() {
        return false;
    }

    /**
     * Placeholder for local file processing
     * @returns Boolean
     */
    supportsLocal() {
        return false;
    }

    /*
     * Placeholder for blockchain specific connection.
     * @returns {String}
     */
    _connect(nodeToConnect) {
        throw "Needs implementation";
    }

    /*
     * Placeholder for retrieving blockchain account details.
     * @returns {String}
     */
    getAccount(accountName) {
        throw "Needs implementation";
    }

    /*
     * Placeholder for retrieving blockchain account balances.
     * @returns {String}
     */
    getBalances(accountName) {
        throw "Needs implmenetation";
    }

    /*
     * Placeholder for retrieving
     * @returns {String}
     */
    getPublicKey(privateKey) {
        throw "Needs implementation";
    }

    /*
     * Placeholder for retrieving
     * @returns {String}
     */
    getOperation(data, account_id) {
        throw "Needs implementation";
    }

    /*
     * Placeholder for retrieving
     * @returns {String}
     */
    sign(incoming, key) {
        throw "Needs implementation";
    }

    /*
     * Placeholder for retrieving
     * @returns {String}
     */
    broadcast(transaction) {
        throw "Needs implementation";
    }

    /*
     * Placeholder for retrieving
     * @returns {String}
     */
    _signString(key, string) {
        throw "Needs implementation";
    }

    /*
     * Placeholder for verifying a blockchain signature against a pubkey
     * @returns {String}
     */
    _verifyString(signature, publicKey, string) {
        throw "Needs implementation";
    }

    /*
     * Placeholder for performing a blockchain transfer transaction
     * @returns {String}
     */
    transfer(key, from, to, amount, asset, memo = null, broadcast = true) {
        throw "Needs implementation!"
    }

    /*
     * Placeholder for checking fee calculation support
     * @returns {String}
     */
    supportsFeeCalculation() {
        return false;
    }

    /*
     * Placeholder for retrieving a blockchain asset
     * @returns {String}
     */
    getAsset(assetSymbolOrId) {
        throw "Needs implementation!";
    }

    /*
    * Fetch account/address list to warn users about
    * @returns {Array}
    */
    getBlockedAccounts() {
        return false;
    }

    /*
     * Placeholder for retrieving a blockchain explorer URL
     * @returns {String}
     */
    getExplorer(account) {
        return false;
    }

    /*
     * Placeholder for displaying prompt contents
     * @returns {String}
     */
    visualize(thing) {
        return false;
    }

    /*
     * Placeholder for signing nfts
     * @returns {String}
     */
    signNFT(thing) {
        return false;
    }

}