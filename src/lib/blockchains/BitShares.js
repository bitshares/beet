import BlockchainAPI from "./BlockchainAPI";
import { Apis } from "bitsharesjs-ws";
import {
    Aes,
    TransactionHelper,
    PrivateKey,
    PublicKey,
    TransactionBuilder,
    Signature,
} from "bitsharesjs";
import * as Socket from "simple-websocket";

import * as Actions from "../Actions";

import beautify from "./bitshares/beautify";
import RendererLogger from "../RendererLogger";
import { humanReadableFloat } from "../assetUtils";
const logger = new RendererLogger();

/**
 * Returns the value of a nested property within an object, given a string path.
 * @param {Object} obj - The object to search for the property.
 * @param {string} path - The string path of the property to retrieve.
 * @param {*} defaultValue - The default value to return if the property is not found.
 * @returns {*} The value of the property, or the default value if the property is not found.
 */
const get = (obj, path, defaultValue = undefined) => {
    const result = path
        .split(".")
        .reduce(
            (res, key) => (res !== null && res !== undefined ? res[key] : res),
            obj
        );
    return result !== undefined && result !== obj ? result : defaultValue;
};

/**
 * Splits an array into smaller arrays of a specified size.
 * @param {Array} input - The array to split.
 * @param {number} size - The size of each chunk.
 * @returns {Array} An array of smaller arrays, each of size 'size'.
 */
const chunk = (input, size) => {
    return input.reduce((arr, item, idx) => {
        return idx % size === 0
            ? [...arr, [item]]
            : [...arr.slice(0, -1), [...arr.slice(-1)[0], item]];
    }, []);
};

export default class BitShares extends BlockchainAPI {
    /*
     * Signing a Bitshares NFT with the user's account.
     * @param {string} key
     * @param {String} nft_object
     * @returns {Promise}
     */
    signNFT(key, nft_object) {
        return new Promise((resolve, reject) => {
            let updatedObject = JSON.parse(nft_object);
            updatedObject.sig_pubkey_or_address = this.getPublicKey(key);
            try {
                resolve({
                    key: this.getPublicKey(key),
                    signed: updatedObject,
                    signature: this._signString(
                        key,
                        JSON.stringify(updatedObject)
                    ),
                });
            } catch (error) {
                console.log(error);
                reject(error);
            }
        });
    }

    /**
     * Returning the list of injectable operations
     * @returns {Array}
     */
    getOperationTypes() {
        // No virtual operations included
        return [
            // Beet based
            {
                id: Actions.GET_ACCOUNT,
                from: "",
                method: Actions.GET_ACCOUNT,
            },
            {
                id: Actions.REQUEST_SIGNATURE,
                from: "",
                method: Actions.REQUEST_SIGNATURE,
            },
            {
                id: Actions.INJECTED_CALL,
                from: "",
                method: Actions.INJECTED_CALL,
            },
            {
                id: Actions.VOTE_FOR,
                from: "",
                method: Actions.VOTE_FOR,
            },
            {
                id: Actions.SIGN_MESSAGE,
                from: "",
                method: Actions.SIGN_MESSAGE,
            },
            {
                id: Actions.SIGN_NFT,
                from: "",
                method: Actions.SIGN_NFT,
            },
            {
                id: Actions.VERIFY_MESSAGE,
                from: "",
                method: Actions.VERIFY_MESSAGE,
            },
            {
                id: Actions.TRANSFER,
                from: "",
                method: Actions.TRANSFER,
            },
            // Blockchain based:
            {
                id: 0,
                from: "",
                method: "transfer",
            },
            {
                id: 1,
                from: "seller",
                method: "limit_order_create",
            },
            {
                id: 2,
                from: "fee_paying_account",
                method: "limit_order_cancel",
            },
            {
                id: 3,
                from: "funding_account",
                method: "call_order_update",
            },
            {
                id: 5,
                from: "registrar",
                method: "account_create",
            },
            {
                id: 6,
                from: "account",
                method: "account_update",
            },
            {
                id: 7,
                from: "authorizing_account",
                method: "account_whitelist",
            },
            {
                id: 8,
                from: "account_to_upgrade",
                method: "account_upgrade",
            },
            {
                id: 9,
                from: "account_id",
                method: "account_transfer",
            },
            {
                id: 10,
                from: "issuer",
                method: "asset_create",
            },
            {
                id: 11,
                from: "issuer",
                method: "asset_update",
            },
            {
                id: 12,
                from: "issuer",
                method: "asset_update_bitasset",
            },
            {
                id: 13,
                from: "issuer",
                method: "asset_update_feed_producers",
            },
            {
                id: 14,
                from: "issuer",
                method: "asset_issue",
            },
            {
                id: 15,
                from: "payer",
                method: "asset_reserve",
            },
            {
                id: 16,
                from: "from_account",
                method: "asset_fund_fee_pool",
            },
            {
                id: 17,
                from: "account",
                method: "asset_settle",
            },
            {
                id: 18,
                from: "issuer",
                method: "asset_global_settle",
            },
            {
                id: 19,
                from: "publisher",
                method: "asset_publish_feed",
            },
            {
                id: 20,
                from: "witness_account",
                method: "witness_create",
            },
            {
                id: 21,
                from: "witness_account",
                method: "witness_update",
            },
            {
                id: 22,
                from: "fee_paying_account",
                method: "proposal_create",
            },
            {
                id: 23,
                from: "fee_paying_account",
                method: "proposal_update",
            },
            {
                id: 24,
                from: "fee_paying_account",
                method: "proposal_delete",
            },
            {
                id: 25,
                from: "withdraw_from_account",
                method: "withdraw_permission_create",
            },
            {
                id: 26,
                from: "withdraw_from_account",
                method: "withdraw_permission_update",
            },
            {
                id: 27,
                from: "withdraw_from_account",
                method: "withdraw_permission_claim",
            },
            {
                id: 28,
                from: "withdraw_from_account",
                method: "withdraw_permission_delete",
            },
            {
                id: 29,
                from: "committee_member_account",
                method: "committee_member_create",
            },
            {
                id: 30,
                from: "",
                method: "committee_member_update",
            },
            {
                id: 31,
                from: "committee_member_account",
                method: "committee_member_update_global_parameters",
            },
            {
                id: 32,
                from: "",
                method: "vesting_balance_create",
            },
            {
                id: 33,
                from: "owner",
                method: "vesting_balance_withdraw",
            },
            {
                id: 34,
                from: "owner",
                method: "worker_create",
            },
            {
                id: 35,
                from: "payer",
                method: "custom",
            },
            {
                id: 36,
                from: "fee_paying_account",
                method: "assert",
            },
            {
                id: 37,
                from: "deposit_to_account",
                method: "balance_claim",
            },
            {
                id: 38,
                from: "from",
                method: "override_transfer",
            },
            {
                id: 39,
                from: "from",
                method: "transfer_to_blind",
            },
            {
                id: 40,
                from: "",
                method: "blind_transfer",
            },
            {
                id: 41,
                from: "",
                method: "transfer_from_blind",
            },
            {
                id: 43,
                from: "issuer",
                method: "asset_claim_fees",
            },
            {
                id: 45,
                from: "bidder",
                method: "bid_collateral",
            },
            {
                id: 47,
                from: "issuer",
                method: "asset_claim_pool",
            },
            {
                id: 48,
                from: "issuer",
                method: "asset_update_issuer",
            },
            {
                id: 49,
                from: "from",
                method: "htlc_create",
            },
            {
                id: 50,
                from: "redeemer",
                method: "htlc_redeem",
            },
            {
                id: 52,
                from: "update_issuer",
                method: "htlc_extend",
            },
            {
                id: 54,
                from: "account",
                method: "custom_authority_create",
            },
            {
                id: 55,
                from: "account",
                method: "custom_authority_update",
            },
            {
                id: 56,
                from: "account",
                method: "custom_authority_delete",
            },
            {
                id: 57,
                from: "account",
                method: "ticket_create",
            },
            {
                id: 58,
                from: "account",
                method: "ticket_update",
            },
            {
                id: 59,
                from: "account",
                method: "liquidity_pool_create",
            },
            {
                id: 60,
                from: "account",
                method: "liquidity_pool_delete",
            },
            {
                id: 61,
                from: "account",
                method: "liquidity_pool_deposit",
            },
            {
                id: 62,
                from: "account",
                method: "liquidity_pool_withdraw",
            },
            {
                id: 63,
                from: "account",
                method: "liquidity_pool_exchange",
            },
            {
                id: 64,
                from: "owner_account",
                method: "samet_fund_create",
            },
            {
                id: 65,
                from: "owner_account",
                method: "samet_fund_delete",
            },
            {
                id: 66,
                from: "owner_account",
                method: "samet_fund_update",
            },
            {
                id: 67,
                from: "borrower",
                method: "samet_fund_borrow",
            },
            {
                id: 68,
                from: "account",
                method: "samt_fund_repay",
            },
            {
                id: 69,
                from: "owner_account",
                method: "credit_offer_create",
            },
            {
                id: 70,
                from: "owner_account",
                method: "credit_offer_delete",
            },
            {
                id: 71,
                from: "owner_account",
                method: "credit_offer_update",
            },
            {
                id: 72,
                from: "borrower",
                method: "credit_offer_accept",
            },
            {
                id: 73,
                from: "account",
                method: "credit_deal_repay",
            },
            {
                id: 75,
                from: "account",
                method: "liquidity_pool_update_operation",
            },
            {
                id: 76,
                from: "account",
                method: "credit_deal_update_operation",
            },
            {
                id: 77,
                from: "seller",
                method: "limit_order_update_operation",
            },
        ];
    }

    /**
     * Test a wss url for successful connection.
     * @param {String} url
     * @returns {Object}
     */
    _testConnection(url) {
        let timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                resolve(null);
            }, 2000);
        });

        let connectionPromise = new Promise(async (resolve, reject) => {
            //console.log(`Testing: ${url}`);
            let before = new Date();
            let beforeTS = before.getTime();

            let socket = new Socket(url);
            socket.on("connect", () => {
                let now = new Date();
                let nowTS = now.getTime();
                socket.destroy();
                //console.log(`Success: ${url} (${nowTS - beforeTS}ms)`);
                return resolve({ url: url, lag: nowTS - beforeTS });
            });

            socket.on("error", (error) => {
                //console.log(`Failure: ${url}`);
                socket.destroy();
                return resolve(null);
            });
        });

        const fastestPromise = Promise.race([
            connectionPromise,
            timeoutPromise,
        ]).catch((error) => {
            return null;
        });

        return fastestPromise;
    }

    /**
     * Test the wss nodes, return latencies and fastest url.
     * @returns {Promise}
     */
    async _testNodes() {
        return new Promise(async (resolve, reject) => {
            let urls = this.getNodes().map((node) => node.url);

            let filteredURLS = urls.filter((url) => {
                if (!this._tempBanned || !this._tempBanned.includes(url)) {
                    return true;
                }
            });

            return Promise.all(
                filteredURLS.map((url) => this._testConnection(url))
            )
                .then((validNodes) => {
                    let filteredNodes = validNodes.filter((x) => x);
                    if (filteredNodes.length) {
                        let sortedNodes = filteredNodes.sort(
                            (a, b) => a.lag - b.lag
                        );
                        let now = new Date();
                        return resolve({
                            node: sortedNodes[0].url,
                            latencies: sortedNodes,
                            timestamp: now.getTime(),
                        });
                    } else {
                        console.error(
                            "No valid BTS WSS connections established; Please check your internet connection."
                        );
                        return reject();
                    }
                })
                .catch((error) => {
                    console.log(error);
                });
        });
    }

    /*
     * Fetch account/address list to warn users about
     * List is maintained by the Bitshares committee
     * @returns {Array}
     */
    getBlockedAccounts() {
        return new Promise(async (resolve, reject) => {
            if (this._config.identifier === "BTS_TEST") {
                console.log("testnet - no blocked accounts");
                return resolve([]);
            }

            let committeeAccountDetails;
            try {
                committeeAccountDetails = await this.getAccount(
                    "committee-blacklist-manager"
                );
            } catch (error) {
                console.log(error);
                return reject(error);
            }

            if (!committeeAccountDetails) {
                return reject("Committee account details not found");
            }

            let blockedAccounts = committeeAccountDetails.blacklisted_accounts;
            return resolve(blockedAccounts);
        });
    }

    /**
     * Fetch a working node to connect to, using bitsharesws-js manager class
     * Unused code - manager class failed to disconnect fast enough.
     * @returns {Promise}
     */
    /*
    _fetchValidNode() {
        return new Promise((resolve, reject) => {
            let urls = this.getNodes().map(node => node.url);

            let filteredURLS = urls.filter(url => {
              if (!this._tempBanned || !this._tempBanned.includes(url)) {
                return true;
              }
            });

            let connectionManager = new Manager({
                url: filteredURLS[0],
                urls: filteredURLS,
                closeCb: res => {
                  console.log(res);
                },
                optionalApis: {enableOrders: true},
                urlChangeCallback: url => {
                    console.log("urlChangeCallback:", url);
                }
            })

            connectionManager
            .checkConnections()
            .then(res => {
                let urls = Object.keys(res);
                let ascLagNodes = urls.map(url => {
                                    return { url: url, lag: res[url] };
                                  }).sort((a, b) => a.lag - b.lag);
                //console.log("best node: ", ascLagNodes[0]);
                let now = new Date();
                resolve({
                  node: ascLagNodes[0].url,
                  latencies: ascLagNodes,
                  timestamp: now.getTime()
                })
            })
            .catch(err => {
                console.log("doLatencyUpdate error", err);
                reject();
            })
        });
    }
    */

    /*
     * Check if the connection needs reestablished (placeholder replacement)
     * @returns {Boolean}
     */
    async _needsNewConnection() {
        return new Promise(async (resolve, reject) => {
            if (
                !this._isConnected ||
                !this._isConnectedToNode ||
                !this._nodeLatencies
            ) {
                return resolve(true);
            }

            if (this._isTestnet()) {
                let _isConnectedToTestnet =
                    Apis.instance().url.indexOf("testnet") !== -1;
                return resolve(_isConnectedToTestnet !== this._isTestnet());
            }

            let testConnection = await this._testConnection(
                this._isConnectedToNode
            );
            let connectionResult =
                testConnection && testConnection.url ? false : true;
            return resolve(connectionResult);
        });
    }

    /*
     * Establish a connection
     * @param {String} nodeToConnect
     * @param {Promise} resolve
     * @param {Promise} reject
     * @returns {String}
     */
    _establishConnection(nodeToConnect, resolve, reject) {
        if (!nodeToConnect) {
            this._connectionFailed(reject, "", "No node url");
        }

        Apis.instance(
            nodeToConnect,
            true,
            4000,
            { enableCrypto: false, enableOrders: false },
            console.log("Initial WSS Connection closed")
        )
            .init_promise.then((res) => {
                console.log({ msg: "established connection", res });
                this._connectionEstablished(resolve, nodeToConnect);
            })
            .catch((error) => {
                console.log(error);
                this._connectionFailed(reject, nodeToConnect, error);
            });
    }

    /*
     * Connect to the Bitshares blockchain. (placeholder replacement)
     * @param {String||null} nodeToConnect
     * @returns {String}
     */
    _connect(nodeToConnect = null) {
        return new Promise((resolve, reject) => {
            if (nodeToConnect) {
                //console.log(`nodetoconnect: ${nodeToConnect}`)
                return this._establishConnection(
                    nodeToConnect,
                    resolve,
                    reject
                );
            }

            if (
                this._isConnected &&
                this._isConnectedToNode &&
                !nodeToConnect
            ) {
                //console.log(`isConnected: ${this._isConnectedToNode}`)
                return this._connectionEstablished(
                    resolve,
                    this._isConnectedToNode
                );
            }

            let diff;
            if (this._nodeCheckTime) {
                let now = new Date();
                let nowTS = now.getTime();
                diff = Math.abs(
                    Math.round((nowTS - this._nodeCheckTime) / 1000)
                );
            }

            if (
                !nodeToConnect &&
                (!this._nodeLatencies || (diff && diff > 360))
            ) {
                // initializing the blockchain
                return this._testNodes()
                    .then((res) => {
                        this._node = res.node;
                        this._nodeLatencies = res.latencies;
                        this._nodeCheckTime = res.timestamp;
                        console.log(`Establishing connection to ${res.node}`);
                        return this._establishConnection(
                            res.node,
                            resolve,
                            reject
                        );
                    })
                    .catch((error) => {
                        console.log(error);
                        return this._connectionFailed(
                            reject,
                            "",
                            "Node test fail"
                        );
                    });
            } else if (!nodeToConnect && this._nodeLatencies) {
                // blockchain has previously been initialized
                let filteredNodes = this._nodeLatencies.filter((item) => {
                    if (!this._tempBanned.includes(item.url)) {
                        return true;
                    }
                });

                this._nodeLatencies = filteredNodes;
                if (!filteredNodes || !filteredNodes.length) {
                    return this._connectionFailed(
                        reject,
                        "",
                        "No working nodes"
                    );
                }

                this._node = filteredNodes[0].url;
                return this._establishConnection(
                    filteredNodes[0].url,
                    resolve,
                    reject
                );
            }
        });
    }

    /*
     * Returns an array of default import options. (placeholder replacement)
     * @returns {Array}
     */
    getImportOptions() {
        return [
            {
                type: "ImportKeys",
                translate_key: "import_keys",
            },
            {
                type: "bitshares/ImportBinFile",
                translate_key: "import_bin",
            },
            {
                type: "bitshares/ImportCloudPass",
                translate_key: "import_pass",
            },
            {
                type: "bitshares/ImportMemo",
                translate_key: "import_only_memo",
            },
        ];
    }

    /*
     * Retrieve the contents of the provided account name from the blockchain API
     * @param {String} accountName
     * @returns {Object} parsedAccount
     */
    async getAccount(accountName) {
        let timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                resolve(null);
            }, 3000);
        });

        let timeLimitedPromise = new Promise(async (resolve, reject) => {
            this.ensureConnection()
                .then(() => {
                    Apis.instance()
                        .db_api()
                        .exec("get_full_accounts", [[accountName], false])
                        .then((response) => {
                            if (
                                !response ||
                                !response.length ||
                                !response[0].length
                            ) {
                                console.log({
                                    error: "Failed to query blockchain",
                                    apiURL: Apis.instance().url,
                                    response: response,
                                    accountName: accountName,
                                });
                                return reject("Failed to query BTS blockchain");
                            }

                            let parsedAccount = response[0][1].account;
                            parsedAccount.active.public_keys =
                                parsedAccount.active.key_auths;
                            parsedAccount.owner.public_keys =
                                parsedAccount.owner.key_auths;
                            parsedAccount.memo = {
                                public_key: parsedAccount.options.memo_key,
                            };
                            parsedAccount.balances = response[0][1].balances;
                            return resolve(parsedAccount);
                        })
                        .catch((error) => {
                            console.log(`get_full_accounts: ${error}`);
                            return this._connectionFailed(
                                reject,
                                this._node,
                                error
                            );
                        });
                })
                .catch((error) => {
                    console.log(`ensureConnection: ${error}`);
                    reject(error);
                });
        });

        const fastestPromise = Promise.race([
            timeLimitedPromise,
            timeoutPromise,
        ]).catch((error) => {
            return null;
        });

        return fastestPromise;
    }

    /*
     * Get the associated Bitshares account name from the provided account ID
     * @param {String} accountId
     * @returns {String}
     */
    _getAccountName(accountId) {
        return new Promise((resolve, reject) => {
            this.ensureConnection()
                .then(() => {
                    Apis.instance()
                        .db_api()
                        .exec("get_objects", [[accountId]])
                        .then((asset_objects) => {
                            if (asset_objects.length && asset_objects[0]) {
                                resolve(asset_objects[0].name);
                            }
                        })
                        .catch(reject);
                })
                .catch(reject);
        });
    }

    /**
     * Given an array of account IDs, retrieve their account names
     * @param {Array} accountIDs
     * @param {Object}
     */
    _getMultipleAccountNames(accountIDs) {
        return new Promise((resolve, reject) => {
            this.ensureConnection()
                .then(() => {
                    if (!accountIDs) {
                        resolve([]);
                        return;
                    }

                    Apis.instance()
                        .db_api()
                        .exec("get_objects", [accountIDs, false])
                        .then((results) => {
                            if (results && results.length) {
                                const filteredResults = results.filter(
                                    (result) => result !== null
                                );
                                resolve(filteredResults);
                                return;
                            }
                        })
                        .catch((error) => {
                            console.error(
                                "Error fetching account details:",
                                error
                            );
                            reject(error);
                        });
                })
                .catch(reject);
        });
    }

    /*
     * Retrieve multiple asset objects from an array of asset IDs
     * @param {Array} assetIDs
     * @returns {Object}
     */
    _resolveMultipleAssets(assetIDs) {
        let timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                console.log("timed out");
                resolve(null);
            }, 3000);
        });

        let timeLimitedPromise = new Promise(async (resolve, reject) => {
            this.ensureConnection()
                .then(() => {
                    Apis.instance()
                        .db_api()
                        .exec("lookup_asset_symbols", [assetIDs])
                        .then((asset_objects) => {
                            if (asset_objects && asset_objects.length) {
                                resolve(asset_objects);
                            }
                        })
                        .catch((error) => {
                            console.log(error);
                            reject(error);
                        });
                })
                .catch((error) => {
                    console.log(error);
                    reject(error);
                });
        });

        const fastestPromise = Promise.race([
            timeLimitedPromise,
            timeoutPromise,
        ]).catch((error) => {
            return null;
        });

        return fastestPromise;
    }

    /*
     * Retrieve an asset object from a provided asset symbol or ID
     * @param {String} assetSymbolOrId
     * @returns {Object}
     */
    _resolveAsset(assetSymbolOrId) {
        let timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                console.log("timed out");
                resolve(null);
            }, 3000);
        });

        let timeLimitedPromise = new Promise(async (resolve, reject) => {
            this.ensureConnection()
                .then(() => {
                    Apis.instance()
                        .db_api()
                        .exec("lookup_asset_symbols", [[assetSymbolOrId]])
                        .then((asset_objects) => {
                            if (asset_objects.length && asset_objects[0]) {
                                resolve(asset_objects[0]);
                            }
                        })
                        .catch((error) => {
                            console.log(error);
                            reject(error);
                        });
                })
                .catch((error) => {
                    console.log(error);
                    reject(error);
                });
        });

        const fastestPromise = Promise.race([
            timeLimitedPromise,
            timeoutPromise,
        ]).catch((error) => {
            return null;
        });

        return fastestPromise;
    }

    /*
     * Retrieve an asset object from a provided asset symbol or ID
     * @param {String} assetSymbolOrId
     * @returns {Object}
     */
    getAsset(assetSymbolOrId) {
        let timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                resolve(null);
            }, 3000);
        });

        let timeLimitedPromise = new Promise(async (resolve, reject) => {
            if (this._isTestnet()) {
                if (assetSymbolOrId == "1.3.0") {
                    return resolve({
                        asset_id: "1.3.0",
                        symbol: "TEST",
                        precision: 5,
                    });
                } else {
                    // TODO: Provide testnet bitshares lookup
                    return reject(null);
                }
            }

            this.ensureConnection()
                .then(() => {
                    Apis.instance()
                        .db_api()
                        .exec("lookup_asset_symbols", [[assetSymbolOrId]])
                        .then((asset_objects) => {
                            if (!asset_objects.length || !asset_objects[0]) {
                                return resolve(null);
                            }

                            let retrievedAsset = asset_objects[0];
                            return resolve({
                                asset_id: retrievedAsset.id,
                                symbol: retrievedAsset.symbol,
                                precision: retrievedAsset.precision,
                            });
                        })
                        .catch((error) => {
                            console.log(error);
                            reject(error);
                        });
                })
                .catch((error) => {
                    console.log(error);
                    reject(error);
                });
        });

        const fastestPromise = Promise.race([
            timeLimitedPromise,
            timeoutPromise,
        ]).catch((error) => {
            return null;
        });

        return fastestPromise;
    }

    /*
     * Retrieve the Bitshares balances for the provided account name.
     * @param {String} accountName
     * @returns {Array} balances
     */
    getBalances(accountName) {
        let timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                resolve(null);
            }, 5000);
        });

        let timeLimitedPromise = new Promise(async (resolve, reject) => {
            // getAccount has already ensureConnection
            this.getAccount(accountName)
                .then((account) => {
                    let neededAssets = [];
                    for (let i = 0; i < account.balances.length; i++) {
                        neededAssets.push(account.balances[i].asset_type);
                    }
                    Apis.instance()
                        .db_api()
                        .exec("get_objects", [neededAssets])
                        .then((assets) => {
                            let balances = [];
                            for (let i = 0; i < account.balances.length; i++) {
                                balances[i] = {
                                    asset_type: account.balances[i].asset_type,
                                    asset_name: assets[i].symbol,
                                    rawbalance: account.balances[i].balance,
                                    balance: humanReadableFloat(
                                        account.balances[i].balance,
                                        assets[i].precision
                                    ),
                                    precision: assets[i].precision,
                                    owner: assets[i].issuer,
                                    prefix:
                                        assets[i].issuer == "1.2.0"
                                            ? "bit"
                                            : "",
                                };
                            }
                            resolve(balances);
                        });
                })
                .catch((error) => {
                    console.log(error);
                    reject(error);
                });
        });

        const fastestPromise = Promise.race([
            timeLimitedPromise,
            timeoutPromise,
        ]).catch((error) => {
            return null;
        });

        return fastestPromise;
    }

    /*
     * Retrieve the pubkey from a provided BTS private key
     * @param {String} privateKey
     * @returns {String} publicKey
     */
    getPublicKey(privateKey) {
        return PrivateKey.fromWif(privateKey)
            .toPublicKey()
            .toString(this._getCoreSymbol());
    }

    /*
     * Map operational data for incoming Bitshares vote actions
     * Retrieves committee members, witnesses and worker proposal objects.
     * @param {Object} incoming
     * @returns {Object}
     */
    mapOperationData(incoming) {
        return new Promise((resolve, reject) => {
            this.ensureConnection()
                .then(() => {
                    if (incoming.action == "vote") {
                        let entity_id = incoming.params.id.split(".");
                        if (entity_id[0] != "1") {
                            reject("ID format unknown");
                        }
                        if (
                            entity_id[1] != "5" &&
                            entity_id[1] != "6" &&
                            entity_id[1] != "14"
                        ) {
                            reject("Given object does not support voting");
                        }
                        Apis.instance()
                            .db_api()
                            .exec("get_objects", [[incoming.params.id]])
                            .then((objdata) => {
                                switch (entity_id[1]) {
                                    case "5":
                                        Apis.instance()
                                            .db_api()
                                            .exec("get_objects", [
                                                [
                                                    objdata[0]
                                                        .committee_member_account,
                                                ],
                                            ])
                                            .then((objextradata) => {
                                                resolve({
                                                    entity: "committee member",
                                                    description:
                                                        "Commitee member: " +
                                                        objextradata[0].name +
                                                        "\nCommittee Member ID: " +
                                                        incoming.params.id,
                                                    vote_id: objdata[0].vote_id,
                                                });
                                            })
                                            .catch((error) => {
                                                console.log(error);
                                                reject(error);
                                            });
                                        break;
                                    case "6":
                                        Apis.instance()
                                            .db_api()
                                            .exec("get_objects", [
                                                [objdata[0].witness_account],
                                            ])
                                            .then((objextradata) => {
                                                resolve({
                                                    entity: "witness",
                                                    description:
                                                        "Witness: " +
                                                        objextradata[0].name +
                                                        "\nWitness ID: " +
                                                        incoming.params.id,
                                                    vote_id: objdata[0].vote_id,
                                                });
                                            })
                                            .catch((error) => {
                                                console.log(error);
                                                reject(error);
                                            });
                                        break;
                                    case "14":
                                        Apis.instance()
                                            .db_api()
                                            .exec("get_objects", [
                                                [objdata[0].worker_account],
                                            ])
                                            .then((objextradata) => {
                                                let dailyPay =
                                                    objdata[0].daily_pay /
                                                    Math.pow(10, 5);
                                                resolve({
                                                    entity: "worker proposal",
                                                    description:
                                                        "Proposal: " +
                                                        objdata[0].name +
                                                        "\nProposal ID: " +
                                                        incoming.params.id +
                                                        "\nDaily Pay: " +
                                                        dailyPay +
                                                        "BTS\nWorker Account: " +
                                                        objextradata[0].name,
                                                    vote_id:
                                                        objdata[0].vote_for,
                                                });
                                            })
                                            .catch((error) => {
                                                console.log(error);
                                                reject(error);
                                            });
                                        break;
                                }
                            })
                            .catch((error) => {
                                console.log(error);
                                reject(error);
                            });
                    }
                })
                .catch((error) => {
                    console.log(error);
                    reject(error);
                });
        });
    }

    /**
     * Bitshares blockchain implementation of QR code scanning
     * Supported QR codes: Bitshares-ui reference QRs
     * @param {Object} contents
     */
    handleQR(contents) {
        let parsedTransaction;
        try {
            parsedTransaction = this._parseTransactionBuilder(
                JSON.parse(contents)
            );
        } catch (error) {
            console.log(error);
            return;
        }

        return parsedTransaction;
    }

    /**
     * Bitshares supports TOTP codes
     * @returns Boolean
     */
    supportsTOTP() {
        return true;
    }

    /**
     * Bitshares supports QR scanning
     * @returns Boolean
     */
    supportsQR() {
        return true;
    }

    /**
     * Bitshares supports local file processing
     * @returns Boolean
     */
    supportsLocal() {
        return true;
    }

    /*
     * Parse incoming and return a readied transaction builder instance
     * @param {Class||Object} incoming
     * @returns {Class} TransactionBuilder
     */
    _parseTransactionBuilder(incoming) {
        if (incoming instanceof TransactionBuilder) {
            return incoming;
        } else if (
            typeof incoming == "object" &&
            incoming.length > 1 &&
            (incoming[0] == "signAndBroadcast" ||
                incoming[0] == "sign" ||
                incoming[0] == "broadcast")
        ) {
            if (incoming.length <= 3) {
                return new TransactionBuilder(JSON.parse(incoming[1]));
            } else {
                console.warn(
                    "This way of parsing TransactionBuilder is deprecated, use new constructor"
                );
                let tr = new TransactionBuilder();
                tr.ref_block_num = incoming[1];
                tr.ref_block_prefix = incoming[2];
                tr.expiration = incoming[3];
                incoming[4].forEach((op) => {
                    tr.add_operation(tr.get_type_operation(op[0], op[1]));
                });
                return tr;
            }
        } else if (typeof incoming == "object" && incoming.operations) {
            let tr = new TransactionBuilder();

            tr.expiration = incoming.expiration;
            tr.extensions = incoming.extensions;
            tr.signatures = incoming.signatures;
            tr.operations = incoming.operations;

            if (incoming.ref_block_num && incoming.ref_block_prefix) {
                tr.ref_block_num = incoming.ref_block_num;
                tr.ref_block_prefix = incoming.ref_block_prefix;
            } else {
                tr.finalize();
            }

            return tr;
        } else if (incoming.type) {
            let tr = new TransactionBuilder();
            tr.add_type_operation(incoming.type, incoming.data);
            return tr;
        }
        throw "Reconstruction of TransactionBuilder failed";
    }

    /*
     * Parse incoming and return a readied transaction builder instance
     * @param {Class||Object} operation
     * @param {String} key
     * @returns {Class} TransactionBuilder
     */
    sign(operation, key) {
        return new Promise((resolve, reject) => {
            this.ensureConnection()
                .then(() => {
                    let tr = this._parseTransactionBuilder(operation);
                    Promise.all([
                        tr.set_required_fees(),
                        tr.update_head_block(),
                    ]).then(() => {
                        let privateKey = PrivateKey.fromWif(key);
                        tr.add_signer(
                            privateKey,
                            privateKey
                                .toPublicKey()
                                .toPublicKeyString(this._getCoreSymbol())
                        );
                        tr.finalize()
                            .then(() => {
                                tr.sign();
                                resolve(tr);
                            })
                            .catch((error) => {
                                console.log(error);
                                reject(error);
                            });
                    });
                })
                .catch((error) => {
                    console.log(error);
                    reject(error);
                });
        });
    }

    /*
     * Broadcast a transaction on the Bitshares blockchain.
     * @param {Class||Object} transaction
     * @returns {Object} broadcastResult
     */
    broadcast(transaction) {
        return new Promise((resolve, reject) => {
            this.ensureConnection()
                .then(() => {
                    transaction = this._parseTransactionBuilder(transaction);
                    transaction
                        .broadcast()
                        .then((id) => {
                            resolve(id);
                        })
                        .catch((error) => {
                            console.log(error);
                            reject(error);
                        });
                })
                .catch((error) => {
                    console.log(error);
                    reject(error);
                });
        });
    }

    /*
     * Retrieve operation from input data and account combination
     * @param {Object} data
     * @param {Object} account
     * @returns {Object}
     */
    getOperation(data, account) {
        let timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                resolve(null);
            }, 5000);
        });

        let timeLimitedPromise = new Promise(async (resolve, reject) => {
            this.ensureConnection()
                .then(() => {
                    if (data.action === "vote") {
                        let accountID;
                        try {
                            accountID = account.accountID;
                        } catch (error) {
                            console.log(error);
                        }

                        Apis.instance()
                            .db_api()
                            .exec("get_objects", [[accountID]])
                            .then((accounts) => {
                                let new_options = accounts[0].options;
                                if (
                                    new_options.votes.findIndex(
                                        (item) => item == data.vote_id
                                    ) !== -1
                                ) {
                                    resolve({
                                        vote_id: data.vote_id,
                                        nothingToDo: true,
                                    });
                                }

                                new_options.votes.push(data.vote_id);
                                new_options.votes = new_options.votes.sort(
                                    (a, b) => {
                                        let a_split = a.split(":");
                                        let b_split = b.split(":");
                                        return (
                                            parseInt(a_split[1], 10) -
                                            parseInt(b_split[1], 10)
                                        );
                                    }
                                );
                                resolve({
                                    data: {
                                        account: accountID,
                                        new_options: new_options,
                                    },
                                    type: "account_update",
                                });
                            })
                            .catch((error) => {
                                console.log(error);
                                reject(error);
                            });
                    } else {
                        resolve({ data: data, type: "transfer" });
                    }
                })
                .catch((error) => {
                    console.log(error);
                    reject(error);
                });
        });

        const fastestPromise = Promise.race([
            timeLimitedPromise,
            timeoutPromise,
        ]).catch((error) => {
            return null;
        });

        return fastestPromise;
    }

    /*
     * Signs a string using a provided private key.
     * @param {String} key
     * @param {String} string
     * @returns {String} hexString
     */
    _signString(key, string) {
        let signature = Signature.signBuffer(string, PrivateKey.fromWif(key));
        return signature.toHex();
    }

    /*
     * Verifies that the signature is the BTS public key signed string.
     * @param {String} signature (hex)
     * @param {String} publicKey
     * @param {String} string
     * @returns {Boolean}
     */
    _verifyString(signature, publicKey, string) {
        let _PublicKey = PublicKey;
        let sig = Signature.fromHex(signature);
        let pkey = PublicKey.fromPublicKeyString(
            publicKey,
            this._getCoreSymbol()
        );
        return sig.verifyBuffer(string, pkey);
    }

    /**
     * Create an encrypted memo for transfer operations
     * @param {Object} from
     * @param {Object} to
     * @param {Object} memo
     * @param {String} optionalNonce
     * @param {Boolean} encryptMemo
     * @returns {Object}
     */
    _createMemoObject(
        from,
        to,
        memo,
        optionalNonce = null,
        encryptMemo = true
    ) {
        let nonce = optionalNonce ?? TransactionHelper.unique_nonce_uint64();

        return {
            from: from.memo.public_key,
            to: to.memo.public_key,
            nonce,
            message: encryptMemo
                ? Aes.encrypt_with_checksum(
                      PrivateKey.fromWif(memo.key),
                      to.memo.public_key,
                      nonce,
                      memo.memo
                  )
                : Buffer.isBuffer(memo)
                ? memo.toString("utf-8")
                : memo.memo,
        };
    }

    /*
     * Broadcast a transfer operation on the Bitshares blockchain.
     * @param {String} key
     * @param {String} from
     * @param {String} to
     * @param {String} amount
     * @param {String} memo
     * @returns {Object} transfer result
     */
    async transfer(
        key,
        from,
        to,
        amount,
        memo = null,
        optionalNonce = null,
        encryptMemo = true
    ) {
        if (!amount.amount || !amount.asset_id) {
            throw "Amount must be a dict with amount and asset_id as keys";
        }

        try {
            from = await this.getAccount(from);
        } catch (error) {
            console.log(error);
        }

        try {
            to = await this.getAccount(to);
        } catch (error) {
            console.log(error);
        }

        let memoObject;
        if (memo) {
            try {
                memoObject = this._createMemoObject(
                    from,
                    to,
                    memo,
                    optionalNonce,
                    encryptMemo
                );
            } catch (error) {
                console.log(error);
            }
        }

        let transaction;
        try {
            transaction = await this.sign(
                {
                    type: "transfer",
                    data: {
                        fee: {
                            amount: 0,
                            asset_id: "1.3.0",
                        },
                        from: from.id,
                        to: to.id,
                        amount: amount,
                        memo: memoObject ?? undefined,
                    },
                },
                key
            );
        } catch (error) {
            console.log(error);
            throw "Could not sign operation with Bitshares key";
        }

        let broadcastResult;
        try {
            broadcastResult = await this.broadcast(transaction);
        } catch (error) {
            console.log(error);
            throw "Could not broadcast signed Bitshares transaction";
        }

        return broadcastResult;
    }

    /*
     * Return an appropriate Bitshares blockchain explorer link.
     * Warning: Opens dangerously, be cautious adding alt explorers.
     * @param {Object} object
     * @returns {String}
     */
    getExplorer(object) {
        if (object.accountName) {
            return "https://blocksights.info/#/accounts/" + object.accountID;
        } else if (object.opid) {
            // 1.11.833380474
            return "https://blocksights.info/#/operations/" + object.opid;
        } else if (object.txid) {
            // e94404a94b4bb160601241ffb78ad0e615a9636b
            return "https://blocksights.info/#/txs/" + object.txid;
        } else {
            return false;
        }
    }

    /*
     * Returns the required keys for sign up input forms
     * @returns {Object}
     */
    getSignUpInput() {
        return {
            active: false,
            memo: true,
            owner: false,
        };
    }

    /*
     * Returns the remaining nodes sorted by asc latency
     * @returns {Array}
     */
    getLatencies() {
        return this._nodeLatencies ?? [];
    }

    /*
     * Returns a visualization for the input data.
     * TODO: Requires refactor
     * @param {String||Class||Object} thing
     * @returns {String}
     */
    async visualize(thing) {
        if (typeof thing == "string" && thing.startsWith("1.2.")) {
            return await this._getAccountName(thing);
        }

        if (!thing) {
            console.log("Nothing to visualize");
            return;
        }

        let tr;
        try {
            tr = await this._parseTransactionBuilder(thing);
        } catch (error) {
            console.log(error);
            return;
        }

        // iterate over to get the operations
        // summarize the details we need to query from the blockchain
        // try to reduce duplicate calls
        let accountsToFetch = [];
        let assetsToFetch = [];
        for (let i = 0; i < tr.operations.length; i++) {
            let operation = tr.operations[i];
            const op = operation[1];
            const idKeys = [
                "account_id_type",
                "from",
                "from_account",
                "to",
                "witness_account",
                "fee_paying_account",
                "funding_account",
                "seller",
                "registrar",
                "referrer",
                "account",
                "authorizing_account",
                "account_to_list",
                "account_to_upgrade",
                "account_id",
                "issuer",
                "issue_to_account",
                "payer",
                "publisher",
                "fee_paying_account",
                "authorized_account",
                "withdraw_from_account",
                "committee_member_account",
                "creator",
                "owner",
                "owner_account",
                "new_owner",
                "deposit_to_account",
                "bidder",
                "new_issuer",
                "redeemer",
                "update_issuer",
                "borrower",
            ];

            const assetKeys = [
                "amount.asset_id",
                "min_to_receive.asset_id",
                "amount_to_sell.asset_id",
                "delta_collateral.asset_id",
                "delta_debt.asset_id",
                "asset_to_update",
                "new_options.short_backing_asset",
                "asset_to_issue.asset_id",
                "asset_to_reserve.asset_id",
                "asset_id",
                "asset_to_settle",
                "settle_price.base.asset_id",
                "settle_price.quote.asset_id",
                "withdrawal_limit.asset_id",
                "asset_to_withdraw.asset_id",
                "amount_to_claim.asset_id",
                "additional_collateral.asset_id",
                "debtCovered.asset_id",
                "amount_for_new_target.asset_id",
                "asset_a",
                "asset_b",
                "share_asset",
                "amount_a.asset_id",
                "amount_b.asset_id",
                "share_amount.asset_id",
                "delta_amount.asset_id",
                "borrow_amount.asset_id",
                "repay_amount.asset_id",
                "fund_fee.asset_id",
                "collateral.asset_id",
                "credit_fee.asset_id",
                "delta_amount_to_sell.asset_id",
                "fee.asset_id",
            ];

            for (let k = 0; k < idKeys.length; k++) {
                const id = get(op, idKeys[k]);
                if (id && !accountsToFetch.includes(id)) {
                    accountsToFetch.push(id);
                }
            }

            for (let z = 0; z < assetKeys.length; z++) {
                const id = get(op, assetKeys[z]);
                if (id && !assetsToFetch.includes(id)) {
                    assetsToFetch.push(id);
                }
            }
        }

        let accountResults = [];
        let accountBatches = chunk(accountsToFetch, 100);
        for (let i = 0; i < accountBatches.length; i++) {
            let fetchedAccountNames;
            try {
                fetchedAccountNames = await this._getMultipleAccountNames(
                    accountBatches[i]
                );
            } catch (error) {
                console.log(error);
            }

            if (fetchedAccountNames && fetchedAccountNames.length) {
                let finalNames = fetchedAccountNames.map((user) => {
                    return { id: user.id, accountName: user.name };
                });

                accountResults.push(...finalNames);
            }
        }

        let assetResults = [];
        let assetBatches = chunk(assetsToFetch, this._isTestnet() ? 9 : 49);
        for (let i = 0; i < assetBatches.length; i++) {
            let fetchedAssets;
            try {
                fetchedAssets = await this._resolveMultipleAssets(
                    assetBatches[i]
                );
            } catch (error) {
                console.log(error);
            }

            if (fetchedAssets && fetchedAssets.length) {
                assetResults.push(...fetchedAssets);
            }
        }

        let beautifiedOpPromises = [];
        //  https://github.com/bitshares/bitsharesjs/blob/master/lib/serializer/src/operations.js#L1551
        for (let i = 0; i < tr.operations.length; i++) {
            let operationArray = tr.operations[i]; // extract operation i from transaction
            const opType = operationArray[0]; // type id
            const opContents = operationArray[1]; // operation object
            const btsOperationTypes = this.getOperationTypes();

            let relevantOperationType = btsOperationTypes.find(
                (op) => op.id === opType
            );
            beautifiedOpPromises.push(
                beautify(
                    accountResults, // fetched accounts
                    assetResults, // fetched assets
                    opContents,
                    operationArray,
                    opType,
                    relevantOperationType
                )
            );
        }

        return Promise.all(beautifiedOpPromises)
            .then((operations) => {
                if (
                    operations.some(
                        (op) =>
                            !Object.prototype.hasOwnProperty.call(op, "rows")
                    )
                ) {
                    /*
                console.log({
                    invalid: operations.filter(op => !Object.prototype.hasOwnProperty.call(op, 'rows')),
                    valid: operations.filter(op => Object.prototype.hasOwnProperty.call(op, 'rows'))
                });
                */
                    throw new Error(
                        "There's an issue with the format of an operation!"
                    );
                }
                return operations;
            })
            .catch((error) => {
                console.log(error);
            });
    }
}
