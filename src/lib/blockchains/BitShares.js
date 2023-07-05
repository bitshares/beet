import BlockchainAPI from "./BlockchainAPI";
import {Apis} from "bitsharesjs-ws";
import {
    Aes,
    TransactionHelper,
    PrivateKey,
    PublicKey,
    TransactionBuilder,
    Signature
} from "bitsharesjs";
import * as Socket from "simple-websocket";

import * as Actions from '../Actions';

import RendererLogger from "../RendererLogger";
import {formatAsset, humanReadableFloat} from "../assetUtils";
const logger = new RendererLogger();

/**
 * Returns the value of a nested property within an object, given a string path.
 * @param {Object} obj - The object to search for the property.
 * @param {string} path - The string path of the property to retrieve.
 * @param {*} defaultValue - The default value to return if the property is not found.
 * @returns {*} The value of the property, or the default value if the property is not found.
 */
const get = (obj, path, defaultValue = undefined) => {
    const result = path.split('.').reduce((res, key) => (res !== null && res !== undefined) ? res[key] : res, obj);
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

const permission_flags = {
    charge_market_fee: 0x01 /**< an issuer-specified percentage of all market trades in this asset is paid to the issuer */,
    white_list: 0x02 /**< accounts must be whitelisted in order to hold this asset */,
    override_authority: 0x04 /**< issuer may transfer asset back to himself */,
    transfer_restricted: 0x08 /**< require the issuer to be one party to every transfer */,
    disable_force_settle: 0x10 /**< disable force settling */,
    global_settle: 0x20 /**< allow the bitasset issuer to force a global settling -- this may be set in permissions, but not flags */,
    disable_confidential: 0x40 /**< allow the asset to be used with confidential transactions */,
    witness_fed_asset: 0x80 /**< allow the asset to be fed by witnesses */,
    committee_fed_asset: 0x100 /**< allow the asset to be fed by the committee */,
    lock_max_supply: 0x200, ///< the max supply of the asset can not be updated
    disable_new_supply: 0x400, ///< unable to create new supply for the asset
    disable_mcr_update: 0x800, ///< the bitasset owner can not update MCR, permission only
    disable_icr_update: 0x1000, ///< the bitasset owner can not update ICR, permission only
    disable_mssr_update: 0x2000, ///< the bitasset owner can not update MSSR, permission only
    disable_bsrm_update: 0x4000, ///< the bitasset owner can not update BSRM, permission only
    disable_collateral_bidding: 0x8000 ///< Can not bid collateral after a global settlement
};

const uia_permission_mask = [
    "charge_market_fee",
    "white_list",
    "override_authority",
    "transfer_restricted",
    "disable_confidential"
];

/**
 * 
 * @param {String} mask 
 * @param {Boolean} isBitAsset 
 * @returns Object
 */
function getFlagBooleans(mask, isBitAsset = false) {
    let booleans = {
        charge_market_fee: false,
        white_list: false,
        override_authority: false,
        transfer_restricted: false,
        disable_force_settle: false,
        global_settle: false,
        disable_confidential: false,
        witness_fed_asset: false,
        committee_fed_asset: false,
        lock_max_supply: false,
        disable_new_supply: false,
        disable_mcr_update: false,
        disable_icr_update: false,
        disable_mssr_update: false,
        disable_bsrm_update: false,
        disable_collateral_bidding: false
    };
    
    if (mask === "all") {
        for (let flag in booleans) {
            if (
                !isBitAsset &&
                uia_permission_mask.indexOf(flag) === -1
            ) {
                delete booleans[flag];
            } else {
                booleans[flag] = true;
            }
        }
        return booleans;
    }
    
    for (let flag in booleans) {
        if (
            !isBitAsset &&
            uia_permission_mask.indexOf(flag) === -1
        ) {
            delete booleans[flag];
        } else {
            if (mask & permission_flags[flag]) {
                booleans[flag] = true;
            }
        }
    }
    
    return booleans;
}


export default class BitShares extends BlockchainAPI {

    /*
     * Signing a Bitshares NFT with the user's account.
     * @param {string} key
     * @param {String} nft_object
     * @returns {Promise}
     */
    signNFT(key, nft_object) {
        return new Promise((resolve,reject) => {
            let updatedObject = JSON.parse(nft_object);
            updatedObject.sig_pubkey_or_address = this.getPublicKey(key);
            try {
                resolve({
                    key: this.getPublicKey(key),
                    signed: updatedObject,
                    signature: this._signString(key, JSON.stringify(updatedObject))
                });
            } catch (error) {
                console.log(error)
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
            },
            // Blockchain based:
            {
                id: 0,
                from: '',
                method: "transfer"
            },
            {
                id: 1,
                from: 'seller',
                method: "limit_order_create"
            },
            {
                id: 2,
                from: 'fee_paying_account',
                method: "limit_order_cancel"
            },
            {
                id: 3,
                from: 'funding_account',
                method: "call_order_update"
            },
            {
                id: 5,
                from: 'registrar',
                method: "account_create"
            },
            {
                id: 6,
                from: 'account',
                method: "account_update"
            },
            {
                id: 7,
                from: 'authorizing_account',
                method: "account_whitelist"
            },
            {
                id: 8,
                from: 'account_to_upgrade',
                method: "account_upgrade"
            },
            {
                id: 9,
                from: 'account_id',
                method: "account_transfer"
            },
            {
                id: 10,
                from: 'issuer',
                method: "asset_create"
            },
            {
                id: 11,
                from: 'issuer',
                method: "asset_update"
            },
            {
                id: 12,
                from: 'issuer',
                method: "asset_update_bitasset"
            },
            {
                id: 13,
                from: 'issuer',
                method: "asset_update_feed_producers"
            },
            {
                id: 14,
                from: 'issuer',
                method: "asset_issue"
            },
            {
                id: 15,
                from: 'payer',
                method: "asset_reserve"
            },
            {
                id: 16,
                from: 'from_account',
                method: "asset_fund_fee_pool"
            },
            {
                id: 17,
                from: 'account',
                method: "asset_settle"
            },
            {
                id: 18,
                from: 'issuer',
                method: "asset_global_settle"
            },
            {
                id: 19,
                from: 'publisher',
                method: "asset_publish_feed"
            },
            {
                id: 20,
                from: 'witness_account',
                method: "witness_create"
            },
            {
                id: 21,
                from: 'witness_account',
                method: "witness_update"
            },
            {
                id: 22,
                from: 'fee_paying_account',
                method: "proposal_create"
            },
            {
                id: 23,
                from: 'fee_paying_account',
                method: "proposal_update"
            },
            {
                id: 24,
                from: 'fee_paying_account',
                method: "proposal_delete"
            },
            {
                id: 25,
                from: 'withdraw_from_account',
                method: "withdraw_permission_create"
            },
            {
                id: 26,
                from: 'withdraw_from_account',
                method: "withdraw_permission_update"
            },
            {
                id: 27,
                from: 'withdraw_from_account',
                method: "withdraw_permission_claim"
            },
            {
                id: 28,
                from: 'withdraw_from_account',
                method: "withdraw_permission_delete"
            },
            {
                id: 29,
                from: 'committee_member_account',
                method: "committee_member_create"
            },
            {
                id: 30,
                from: '',
                method: "committee_member_update"
            },
            {
                id: 31,
                from: 'committee_member_account',
                method: "committee_member_update_global_parameters"
            },
            {
                id: 32,
                from: '',
                method: "vesting_balance_create"
            },
            {
                id: 33,
                from: 'owner',
                method: "vesting_balance_withdraw"
            },
            {
                id: 34,
                from: 'owner',
                method: "worker_create"
            },
            {
                id: 35,
                from: 'payer',
                method: "custom"
            },
            {
                id: 36,
                from: 'fee_paying_account',
                method: "assert"
            },
            {
                id: 37,
                from: 'deposit_to_account',
                method: "balance_claim"
            },
            {
                id: 38,
                from: 'from',
                method: "override_transfer"
            },
            {
                id: 39,
                from: 'from',
                method: "transfer_to_blind"
            },
            {
                id: 40,
                from: '',
                method: "blind_transfer"
            },
            {
                id: 41,
                from: '',
                method: "transfer_from_blind"
            },
            {
                id: 43,
                from: 'issuer',
                method: "asset_claim_fees"
            },
            {
                id: 45,
                from: 'bidder',
                method: "bid_collateral"
            },
            {
                id: 47,
                from: 'issuer',
                method: "asset_claim_pool"
            },
            {
                id: 48,
                from: 'issuer',
                method: "asset_update_issuer"
            },
            {
                id: 49,
                from: 'from',
                method: "htlc_create"
            },
            {
                id: 50,
                from: 'redeemer',
                method: "htlc_redeem"
            },
            {
                id: 52,
                from: 'update_issuer',
                method: "htlc_extend"
            },
            {
                id: 54,
                from: 'account',
                method: "custom_authority_create"
            },
            {
                id: 55,
                from: 'account',
                method: "custom_authority_update"
            },
            {
                id: 56,
                from: 'account',
                method: "custom_authority_delete"
            },
            {
                id: 57,
                from: 'account',
                method: "ticket_create"
            },
            {
                id: 58,
                from: 'account',
                method: "ticket_update"
            },
            {
                id: 59,
                from: 'account',
                method: "liquidity_pool_create"
            },
            {
                id: 60,
                from: 'account',
                method: "liquidity_pool_delete"
            },
            {
                id: 61,
                from: 'account',
                method: "liquidity_pool_deposit"
            },
            {
                id: 62,
                from: 'account',
                method: "liquidity_pool_withdraw"
            },
            {
                id: 63,
                from: 'account',
                method: "liquidity_pool_exchange"
            },
            {
                id: 64,
                from: 'owner_account',
                method: "samet_fund_create"
            },
            {
                id: 65,
                from: 'owner_account',
                method: "samet_fund_delete"
            },
            {
                id: 66,
                from: 'owner_account',
                method: "samet_fund_update"
            },
            {
                id: 67,
                from: 'borrower',
                method: "samet_fund_borrow"
            },
            {
                id: 68,
                from: 'account',
                method: "samt_fund_repay"
            },
            {
                id: 69,
                from: 'owner_account',
                method: "credit_offer_create"
            },
            {
                id: 70,
                from: 'owner_account',
                method: "credit_offer_delete"
            },
            {
                id: 71,
                from: 'owner_account',
                method: "credit_offer_update"
            },
            {
                id: 72,
                from: 'borrower',
                method: "credit_offer_accept"
            },
            {
                id: 73,
                from: 'account',
                method: "credit_deal_repay"
            }
        ]
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
            socket.on('connect', () => {
                let now = new Date();
                let nowTS = now.getTime();
                socket.destroy();
                //console.log(`Success: ${url} (${nowTS - beforeTS}ms)`);
                return resolve({ url: url, lag: nowTS - beforeTS });
            });

            socket.on('error', (error) => {
                //console.log(`Failure: ${url}`);
                socket.destroy();
                return resolve(null);
            });
        });

        const fastestPromise = Promise.race([connectionPromise, timeoutPromise]).catch(
            (error) => {
                return null;
            }
        );

        return fastestPromise;
    }

  /**
   * Test the wss nodes, return latencies and fastest url.
   * @returns {Promise}
   */
    async _testNodes() {
      return new Promise(async (resolve, reject) => {
          let urls = this.getNodes().map(node => node.url);

          let filteredURLS = urls.filter(url => {
            if (!this._tempBanned || !this._tempBanned.includes(url)) {
              return true;
            }
          });

          return Promise.all(filteredURLS.map(url => this._testConnection(url)))
          .then((validNodes) => {
            let filteredNodes = validNodes.filter(x => x);
            if (filteredNodes.length) {
              let sortedNodes = filteredNodes.sort((a, b) => a.lag - b.lag);
              let now = new Date();
              return resolve({
                node: sortedNodes[0].url,
                latencies: sortedNodes,
                timestamp: now.getTime()
              });
            } else {
              console.error("No valid BTS WSS connections established; Please check your internet connection.")
              return reject();
            }
          })
          .catch(error => {
            console.log(error);
          })


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
                console.log('testnet - no blocked accounts');
                return resolve([]);
            }

            let committeeAccountDetails;
            try {
                committeeAccountDetails = await this.getAccount('committee-blacklist-manager');
            } catch (error) {
                console.log(error);
                return reject(error);
            }
            
            if (!committeeAccountDetails) {
                return reject('Committee account details not found');
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
                let _isConnectedToTestnet = Apis.instance().url.indexOf("testnet") !== -1;
                return resolve(_isConnectedToTestnet !== this._isTestnet());
            }
    
            let testConnection = await this._testConnection(this._isConnectedToNode);
            let connectionResult = testConnection && testConnection.url ? false : true;
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
          this._connectionFailed(reject, '', 'No node url')
        }

        Apis.instance(
            nodeToConnect,
            true,
            4000,
            {enableCrypto: false, enableOrders: false},
            console.log('Initial WSS Connection closed')
        ).init_promise
        .then((res) => {
          console.log({msg: "established connection", res})
          this._connectionEstablished(resolve, nodeToConnect);
        })
        .catch(error => {
          console.log(error);
          this._connectionFailed(reject, nodeToConnect, error)
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
                return this._establishConnection(nodeToConnect, resolve, reject);
            }

            if (this._isConnected && this._isConnectedToNode && !nodeToConnect) {
                //console.log(`isConnected: ${this._isConnectedToNode}`)
                return this._connectionEstablished(resolve, this._isConnectedToNode);
            }

            let diff;
            if (this._nodeCheckTime) {
                let now = new Date();
                let nowTS = now.getTime();
                diff = Math.abs(Math.round((nowTS - this._nodeCheckTime) / 1000));
            }

            if (!nodeToConnect && (!this._nodeLatencies || diff && diff > 360)) {
                // initializing the blockchain
                return this._testNodes().then((res) => {
                  this._node = res.node;
                  this._nodeLatencies = res.latencies;
                  this._nodeCheckTime = res.timestamp;
                  console.log(`Establishing connection to ${res.node}`);
                  return this._establishConnection(res.node, resolve, reject);
                })
                .catch(error => {
                  console.log(error);
                  return this._connectionFailed(reject, '', 'Node test fail');
                })
            } else if (!nodeToConnect && this._nodeLatencies) {
              // blockchain has previously been initialized
              let filteredNodes = this._nodeLatencies
                                  .filter(item => {
                                    if (!this._tempBanned.includes(item.url)) {
                                      return true;
                                    }
                                  });

              this._nodeLatencies = filteredNodes;
              if (!filteredNodes || !filteredNodes.length) {
                return this._connectionFailed(reject, '', 'No working nodes');
              }

              this._node = filteredNodes[0].url;
              return this._establishConnection(filteredNodes[0].url, resolve, reject);
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
                translate_key: "import_keys"
            },
            {
                type: "bitshares/ImportBinFile",
                translate_key: "import_bin"
            },
            {
                type: "bitshares/ImportCloudPass",
                translate_key: "import_pass"
            },
            {
                type: "bitshares/ImportMemo",
                translate_key: "import_only_memo"
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
            this.ensureConnection().then(() => {
                Apis.instance()
                    .db_api()
                    .exec("get_full_accounts", [[accountName], false])
                    .then(response => {
                        if (!response || !response.length || !response[0].length) {
                            console.log({
                                error: 'Failed to query blockchain',
                                apiURL: Apis.instance().url,
                                response: response,
                                accountName: accountName
                            })
                            return reject('Failed to query BTS blockchain');
                        }

                        let parsedAccount = response[0][1].account;
                        parsedAccount.active.public_keys = parsedAccount.active.key_auths;
                        parsedAccount.owner.public_keys = parsedAccount.owner.key_auths;
                        parsedAccount.memo = {public_key: parsedAccount.options.memo_key};
                        parsedAccount.balances = response[0][1].balances;
                        return resolve(parsedAccount);
                    })
                    .catch(error => {
                        console.log(`get_full_accounts: ${error}`);
                        return this._connectionFailed(reject, this._node, error)
                    })
              })
              .catch(error => {
                  console.log(`ensureConnection: ${error}`);
                  reject(error);
              })
        });

        const fastestPromise = Promise.race([timeLimitedPromise, timeoutPromise]).catch(
            (error) => {
                return null;
            }
        );

        return fastestPromise;
    }

    /*
     * Get the associated Bitshares account name from the provided account ID
     * @param {String} accountId
     * @returns {String}
     */
    _getAccountName(accountId) {
        return new Promise((resolve, reject) => {
            this.ensureConnection().then(() => {
                Apis.instance().db_api().exec("get_objects", [[accountId]]).then((asset_objects) => {
                    if (asset_objects.length && asset_objects[0]) {
                        resolve(asset_objects[0].name);
                    }
                }).catch(reject);
            }).catch(reject);
        });
    }

    /**
     * Given an array of account IDs, retrieve their account names
     * @param {Array} accountIDs
     * @param {Object} 
     */
    _getMultipleAcountNames(accountIDs) {
        return new Promise((resolve, reject) => {
            this.ensureConnection().then(() => {
                if (!accountIDs) {
                    resolve([]);
                    return;
                }

                Apis.instance().db_api().exec("get_full_accounts", [accountIDs, false]).then((results) => {
                    if (results && results.length) {
                        resolve(results);
                        return;
                    }
                }).catch((error) => {
                    console.error('Error fetching account details:', error);
                    reject(error)
                });
            }).catch(reject);
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
                console.log('timed out');
                resolve(null);
            }, 3000);
        });

        let timeLimitedPromise = new Promise(async (resolve, reject) => {
            this.ensureConnection().then(() => {
                Apis.instance().db_api().exec("lookup_asset_symbols", [assetIDs]).then((asset_objects) => {
                    if (asset_objects && asset_objects.length) {
                        resolve(asset_objects);
                    }
                }).catch((error) => {
                    console.log(error);
                    reject(error)
                });
            }).catch((error) => {
                console.log(error);
                reject(error)
            });
        });

        const fastestPromise = Promise.race([timeLimitedPromise, timeoutPromise]).catch(
            (error) => {
                return null;
            }
        );

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
                console.log('timed out');
                resolve(null);
            }, 3000);
        });

        let timeLimitedPromise = new Promise(async (resolve, reject) => {
            this.ensureConnection().then(() => {
                Apis.instance().db_api().exec("lookup_asset_symbols", [[assetSymbolOrId]]).then((asset_objects) => {
                    if (asset_objects.length && asset_objects[0]) {
                        resolve(asset_objects[0]);
                    }
                }).catch((error) => {
                    console.log(error);
                    reject(error)
                });
            }).catch((error) => {
                console.log(error);
                reject(error)
            });
        });

        const fastestPromise = Promise.race([timeLimitedPromise, timeoutPromise]).catch(
            (error) => {
                return null;
            }
        );

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
                        precision: 5
                    });
                } else {
                    // TODO: Provide testnet bitshares lookup
                    return reject(null);
                }
            }
  
            this.ensureConnection().then(() => {
                Apis.instance().db_api().exec("lookup_asset_symbols", [[assetSymbolOrId]]).then((asset_objects) => {
                    if (!asset_objects.length || !asset_objects[0]) {
                      return resolve(null);
                    }
  
                    let retrievedAsset = asset_objects[0];
                    return resolve({
                        asset_id: retrievedAsset.id,
                        symbol: retrievedAsset.symbol,
                        precision: retrievedAsset.precision
                    });
                  }).catch((error) => {
                      console.log(error);
                      reject(error)
                  });
              }).catch((error) => {
                  console.log(error);
                  reject(error)
              });
        });

        const fastestPromise = Promise.race([timeLimitedPromise, timeoutPromise]).catch(
            (error) => {
                return null;
            }
        );

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
            this.getAccount(accountName).then((account) => {
                let neededAssets = [];
                for (let i = 0; i < account.balances.length; i++) {
                    neededAssets.push(account.balances[i].asset_type);
                }
                Apis.instance().db_api().exec("get_objects", [neededAssets]).then((assets) => {
                    let balances = [];
                    for (let i = 0; i < account.balances.length; i++) {
                        balances[i] = {
                            asset_type: account.balances[i].asset_type,
                            asset_name: assets[i].symbol,
                            rawbalance: account.balances[i].balance,
                            balance: humanReadableFloat(account.balances[i].balance, assets[i].precision),
                            precision: assets[i].precision,
                            owner: assets[i].issuer,
                            prefix: assets[i].issuer == "1.2.0" ? "bit" : ""
                        };
                    }
                    resolve(balances);
                });
            }).catch((error) => {
                console.log(error);
                reject(error);
            });
        });

        const fastestPromise = Promise.race([timeLimitedPromise, timeoutPromise]).catch(
            (error) => {
                return null;
            }
        );

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
            this.ensureConnection().then(() => {
                if (incoming.action == "vote") {
                    let entity_id = incoming.params.id.split(".");
                    if (entity_id[0] != "1") {
                        reject("ID format unknown");
                    }
                    if (entity_id[1] != "5" && entity_id[1] != "6" && entity_id[1] != "14") {
                        reject("Given object does not support voting");
                    }
                    Apis.instance().db_api().exec(
                        "get_objects", [[incoming.params.id]]
                    ).then(objdata => {
                        switch (entity_id[1]) {
                            case "5":
                                Apis.instance().db_api().exec(
                                    "get_objects", [[objdata[0].committee_member_account]]
                                ).then(objextradata => {
                                    resolve({
                                        entity: "committee member",
                                        description:
                                            "Commitee member: " +
                                            objextradata[0].name +
                                            "\nCommittee Member ID: " +
                                            incoming.params.id,
                                        vote_id: objdata[0].vote_id
                                    });
                                }).catch(error => {
                                  console.log(error);
                                  reject(error)
                                });
                                break;
                            case "6":
                                Apis.instance().db_api().exec(
                                    "get_objects", [[objdata[0].witness_account]]
                                ).then(objextradata => {
                                    resolve({
                                        entity: "witness",
                                        description:
                                            "Witness: " +
                                            objextradata[0].name +
                                            "\nWitness ID: " +
                                            incoming.params.id,
                                        vote_id: objdata[0].vote_id
                                    });
                                }).catch(error => {
                                  console.log(error);
                                  reject(error)
                                });
                                break;
                            case "14":
                                Apis.instance().db_api().exec(
                                    "get_objects", [[objdata[0].worker_account]]
                                ).then(objextradata => {
                                    let dailyPay = objdata[0].daily_pay / Math.pow(10, 5);
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
                                        vote_id: objdata[0].vote_for
                                    });
                                }).catch(error => {
                                  console.log(error);
                                  reject(error)
                                });
                                break;
                        }
                    }).catch(error => {
                      console.log(error);
                      reject(error)
                    });
                }
            }).catch((error) => {
                console.log(error);
                reject(error)
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
            parsedTransaction = this._parseTransactionBuilder(JSON.parse(contents))
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
        } else if (typeof incoming == "object"
            && incoming.length > 1
            && (incoming[0] == "signAndBroadcast" || incoming[0] == "sign" || incoming[0] == "broadcast")
        ) {
            if (incoming.length <= 3) {
                return new TransactionBuilder(JSON.parse(incoming[1]));
            } else {
                console.warn("This way of parsing TransactionBuilder is deprecated, use new constructor");
                let tr = new TransactionBuilder();
                tr.ref_block_num = incoming[1];
                tr.ref_block_prefix = incoming[2];
                tr.expiration = incoming[3];
                incoming[4].forEach(op => {
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
            tr.add_type_operation(
                incoming.type,
                incoming.data
            );
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
            this.ensureConnection().then(() => {
                let tr = this._parseTransactionBuilder(operation);
                Promise.all([
                    tr.set_required_fees(),
                    tr.update_head_block()
                ]).then(() => {
                    let privateKey = PrivateKey.fromWif(key);
                    tr.add_signer(
                      privateKey,
                      privateKey.toPublicKey().toPublicKeyString(this._getCoreSymbol()));
                    tr.finalize().then(() => {
                        tr.sign();
                        resolve(tr);
                    }).catch((error) => {
                        console.log(error);
                        reject(error)
                    });
                });
            }).catch(error => {
              console.log(error);
              reject(error)
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
            this.ensureConnection().then(() => {
                transaction = this._parseTransactionBuilder(transaction);
                transaction.broadcast().then(id => {
                    resolve(id);
                }).catch(error => {
                  console.log(error);
                  reject(error)
                });
            }).catch((error) => {
                console.log(error);
                reject(error)
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
            this.ensureConnection().then(() => {

                if (data.action === 'vote') {
                  let accountID;
                  try {
                    accountID = account.accountID;
                  } catch (error) {
                    console.log(error)
                  }

                  Apis.instance().db_api().exec("get_objects", [[accountID]]).then((accounts) => {

                      let new_options = accounts[0].options;
                      if (new_options.votes.findIndex(item => item == data.vote_id) !== -1) {
                          resolve({
                             vote_id: data.vote_id,
                             nothingToDo: true
                          });
                      }

                      new_options.votes.push(data.vote_id);
                      new_options.votes = new_options.votes.sort((a, b) => {
                          let a_split = a.split(":");
                          let b_split = b.split(":");
                          return (
                              parseInt(a_split[1], 10) - parseInt(b_split[1], 10)
                          );
                      });
                      resolve({
                        data: {
                            account: accountID,
                            new_options: new_options
                        },
                        type: 'account_update'
                      });

                  }).catch(error => {
                      console.log(error)
                      reject(error);
                  });

                } else {
                  resolve({data: data, type: 'transfer'});
                }
            }).catch((error) => {
                console.log(error);
                reject(error)
            });
        });

        const fastestPromise = Promise.race([timeLimitedPromise, timeoutPromise]).catch(
            (error) => {
                return null;
            }
        );

        return fastestPromise;
    }

    /*
     * Signs a string using a provided private key.
     * @param {String} key
     * @param {String} string
     * @returns {String} hexString
     */
    _signString(key, string) {
        let signature = Signature.signBuffer(
            string,
            PrivateKey.fromWif(key)
        );
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
        let pkey = PublicKey.fromPublicKeyString(publicKey, this._getCoreSymbol());
        return sig.verifyBuffer(
            string,
            pkey
        );
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
                    : memo.memo
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
            throw "Amount must be a dict with amount and asset_id as keys"
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
                        asset_id: "1.3.0"
                    },
                    from: from.id,
                    to: to.id,
                    amount: amount,
                    memo: memoObject ?? undefined
                }
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

        return broadcastResult
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
            owner: false
        }
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
            console.log('Nothing to visualize');
            return;
        }
        
        let operations = [];
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
                "borrower"
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
                "amount_to_sell.asset_id",
                "min_to_receive.asset_id",
                "delta_amount.asset_id",
                "borrow_amount.asset_id",
                "repay_amount.asset_id",
                "fund_fee.asset_id",
                "collateral.asset_id",
                "credit_fee.asset_id"
            ]

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
        let accountBatches = chunk(
            accountsToFetch,
            this._isTestnet() ? 9 : 49
        );
        for (let i = 0; i < accountBatches.length; i++) {
            let fetchedAccountNames;
            try {
                fetchedAccountNames = await this._getMultipleAcountNames(accountBatches[i])
            } catch (error) {
                console.log(error)
            }

            if (fetchedAccountNames && fetchedAccountNames.length) {
                let finalNames = fetchedAccountNames.map((user) => {
                    return {id: user[1].account.id, accountName: user[1].account.name}
                });

                accountResults.push(...finalNames);
            }
        }

        let assetResults = [];
        let assetBatches = chunk(
            assetsToFetch,
            this._isTestnet() ? 9 : 49
        );
        for (let i = 0; i < assetBatches.length; i++) {
            let fetchedAssets;
            try {
                fetchedAssets = await this._resolveMultipleAssets(assetBatches[i])
            } catch (error) {
                console.log(error)
            }

            if (fetchedAssets && fetchedAssets.length) {
                assetResults.push(...fetchedAssets)
            }
        }

        //  https://github.com/bitshares/bitsharesjs/blob/master/lib/serializer/src/operations.js#L1551
        for (let i = 0; i < tr.operations.length; i++) {
            let operation = tr.operations[i];
            const opType = operation[0];
            const op = operation[1];

            let allOpTypes = this.getOperationTypes();
            let relevantOp = allOpTypes.find((op) => op.id === opType);

            const currentOperation = {
                title: `operations.injected.BTS.${relevantOp.method}.title`,
                opType: opType,
                method: relevantOp.method,
                op: op,
                operation: operation
            };
            
            if (opType == 0) {
                // transfer
                let from = accountResults.find((resAcc) => resAcc.id === op.from).accountName;
                let to = accountResults.find((resAcc) => resAcc.id === op.to).accountName;
                let asset = assetResults.find((assRes) => assRes.id === op.amount.asset_id);

                currentOperation['rows'] = [
                    {key: 'from', params: {from: from, opFrom: op.from}},
                    {key: 'to', params: {to: to, opTo: op.to}},
                    {key: 'amount', params: {amount: formatAsset(op.amount.amount, asset.symbol, asset.precision)}}
                ];
            } else if (opType == 1) {
                // limit_order_create
                console.log('limit_order_create 1')
                let seller = accountResults.find((resAcc) => resAcc.id === op.seller).accountName;
                let buy = assetResults.find((assRes) => assRes.id === op.min_to_receive.asset_id);
                let sell = assetResults.find((assRes) => assRes.id === op.amount_to_sell.asset_id);

                if (!buy || !sell) {
                    console.log('Could not resolve assets in limit_order_create');
                    return;
                }

                let fillOrKill = op.amount_to_sell.fill_or_kill;

                let price = humanReadableFloat(op.amount_to_sell.amount, sell.precision)
                    / humanReadableFloat(op.min_to_receive.amount, buy.precision);
                
                currentOperation['rows'] = [
                    {key: fillOrKill ? 'tradeFK' : 'trade'},
                    {key: 'seller', params: {seller: seller, opSeller: op.seller}},
                    {key: 'sell', params: {amount: formatAsset(op.amount_to_sell.amount, sell.symbol, sell.precision)}},
                    {key: 'buying', params: {amount: formatAsset(op.min_to_receive.amount, buy.symbol, buy.precision)}},
                    {key: 'price', params: {price: price.toPrecision(sell.precision), sellSymbol: sell.symbol, buySymbol: buy.symbol}}
                ];
            } else if (opType == 2) {
                // limit_order_cancel
                let feePayingAccount;
                try {
                    feePayingAccount = await this._getAccountName(op.fee_paying_account);
                } catch (error) {
                    console.log(error);
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "id", params: {id: op.order}},
                    {key: "fees", params: {fee: JSON.stringify(op.fee)}},
                    {key: "account", params: {account: feePayingAccount ?? '' + " (" + op.fee_paying_account + ")"}}
                ];
            } else if (opType == 3) {
                // call_order_update
                let fundingAccount = accountResults.find((resAcc) => resAcc.id === op.funding_account).accountName;
                let deltaCollateral = assetResults.find((assRes) => assRes.id === op.delta_collateral.asset_id);
                let deltaDebt = assetResults.find((assRes) => assRes.id === op.delta_debt.asset_id);

                if (!deltaCollateral || !deltaDebt) {
                    console.log('Could not resolve delta fields');
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "funding_account", params: {funding_account: fundingAccount ?? '' + " (" + op.funding_account + ")"}},
                    {
                        key: "delta_collateral",
                        params: {
                            delta_collateral: formatAsset(op.delta_collateral.amount, deltaCollateral.symbol, deltaCollateral.precision),
                            id: op.delta_collateral.asset_id
                        }
                    },
                    {
                        key: "delta_debt",
                        params: {
                            delta_debt: formatAsset(op.delta_debt.amount, deltaDebt.symbol, deltaDebt.precision),
                            id: op.delta_debt.asset_id
                        }
                    },
                    {key: "fees", params: {fee: JSON.stringify(op.fee)}}
                ];
            } else if (opType == 5) {
                // account_create
                let registrar = accountResults.find((resAcc) => resAcc.id === op.registrar).accountName;
                let referrer = accountResults.find((resAcc) => resAcc.id === op.referrer).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {key: "registrar", params: {registrar: registrar ?? '', opRegistrar: op.registrar}},
                        {key: "referrer", params: {referrer: referrer ?? '', opReferrer: op.referrer}},
                        {key: "referrer_percent", params: {referrer_percent: op.referrer_percent}},
                        {key: "name", params: {name: op.name}},
                    {key: "ownerHeader", params: {}},
                        {key: "weight_threshold", params: {weight_threshold: op.owner.weight_threshold}},
                        {key: "account_auths", params: {account_auths: JSON.stringify(op.owner.account_auths)}},
                        {key: "key_auths", params: {key_auths: JSON.stringify(op.owner.key_auths)}},
                        {key: "address_auths", params: {address_auths: JSON.stringify(op.owner.address_auths)}},
                    {key: "activeHeader", params: {}},
                        {key: "weight_threshold", params: {weight_threshold: op.active.weight_threshold}},
                        {key: "account_auths", params: {account_auths: JSON.stringify(op.active.account_auths)}},
                        {key: "key_auths", params: {key_auths: JSON.stringify(op.active.key_auths)}},
                        {key: "address_auths", params: {address_auths: JSON.stringify(op.active.address_auths)}},
                    {key: "optionsHeader", params: {}},
                        {key: "memo_key", params: {memo_key: op.options.memo_key}},
                        {key: "voting_account", params: {voting_account: op.options.voting_account}},
                        {key: "num_witness", params: {num_witness: op.options.num_witness}},
                        {key: "num_committee", params: {num_committee: op.options.num_committee}},
                        {key: "votes", params: {votes: JSON.stringify(op.options.votes)}},
                        {key: "extensions", params: {extensions: JSON.stringify(op.options.extensions)}},
                    {key: "fees", params: {fee: JSON.stringify(op.fee)}}
                ];
            } else if (opType == 6) {
                // account_update
                let targetAccount = accountResults.find((resAcc) => resAcc.id === op.account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "warning", params: {}},
                    {key: "account", params: {account: targetAccount ?? '', opAccount: op.account}},
                    {key: "owner", params: {owner: JSON.stringify(op.owner)}},
                    {key: "active", params: {active: JSON.stringify(op.active)}},
                    {key: "new_options", params: {new_options: JSON.stringify(op.new_options)}},
                    {key: "extensions", params: {extensions: JSON.stringify(op.extensions)}},
                    {key: "fees", params: {fee: JSON.stringify(op.fee)}}
                ];
            } else if (opType == 7) {
                // account_whitelist
                let authorizingAccount = accountResults.find((resAcc) => resAcc.id === op.authorizing_account).accountName;
                let accountToList = accountResults.find((resAcc) => resAcc.id === op.account_to_list).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {
                        key: "authorizing_account",
                        params: {
                            authorizingAccount: authorizingAccount ?? '',
                            authorizingAccountOP: op.authorizing_account
                        }
                    },
                    {
                        key: "account_to_list",
                        params: {
                            accountToList: accountToList ?? '',
                            accountToListOP: op.account_to_list
                        }
                    },
                    {key: "new_listing", params: {new_listing: op.new_listing}},
                    {
                        key: "extensions",
                        params: {
                            extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"
                        }
                    },
                    {key: "fee", params: {fee: JSON.stringify(op.fee)}}
                ];
            } else if (opType == 8) {
                // account_upgrade
                let accountToUpgrade = accountResults.find((resAcc) => resAcc.id === op.account_to_upgrade).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {
                        key: "account_to_upgrade",
                        params: {
                            accountToUpgrade: accountToUpgrade ?? '',
                            accountToUpgradeOP: op.account_to_upgrade
                        }
                    },
                    {key: "upgrade_to_lifetime_member", params: {upgradeToLifetimeMember: op.upgrade_to_lifetime_member}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee)}}
                ];
            } else if (opType == 9) {
                // account_transfer
                let originalOwner = accountResults.find((resAcc) => resAcc.id === op.account_id).accountName;
                let newOwner = accountResults.find((resAcc) => resAcc.id === op.new_owner).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "warning", params: {}},
                    {
                        key: "account_id",
                        params: {
                            originalOwner: originalOwner ?? '',
                            account_id: op.account_id
                        }
                    },
                    {
                        key: "new_owner",
                        params: {
                            newOwner: newOwner ?? '',
                            newOwnerOP: op.new_owner
                        }
                    },
                    {key: "fee", params: {fee: JSON.stringify(op.fee)}}
                ];
            } else if (opType == 10 || opType == 11) {
                // Create or Update an asset
                let asset = opType === 11
                    ? assetResults.find((assRes) => assRes.id === op.asset_to_update) // fetch asset to update
                    : null;
                
                let symbol = asset ? asset.symbol : op.symbol;
                let precision = asset ? asset.precision : op.precision;
                let is_prediction_market = asset ? asset.is_prediction_market : op.is_prediction_market;
                let options = operation[0] == 10 ? op.common_options : op.new_options;
                let max_supply = options.max_supply;
                let market_fee_percent = options.market_fee_percent;
                let max_market_fee = options.max_market_fee;
                let isBitasset = op.bitasset_opts ? true : false;
                let issuer_permissions = getFlagBooleans(options.issuer_permissions, isBitasset);
                let flags = getFlagBooleans(options.flags, isBitasset);
                let cer_base_amount = options.core_exchange_rate.base.amount;
                let cer_base_asset_id = options.core_exchange_rate.base.asset_id;
                let cer_quote_amount = options.core_exchange_rate.quote.amount;
                let cer_quote_asset_id = options.core_exchange_rate.quote.asset_id; 
                let whitelist_authorities = options.whitelist_authorities;
                let blacklist_authorities = options.blacklist_authorities;
                let whitelist_markets = options.whitelist_markets;
                let blacklist_markets = options.blacklist_markets;
                let description = JSON.parse(options.description);
                let nft_object = description ? description.nft_object : null;
                
                let tempRows = [
                    {key: "header", params: {}},
                        {key: "symbol", params: {symbol: symbol}},
                        {key: "main", params: {main: description.main}},
                        {key: "market", params: {market: description.market}},
                        {key: "short_name", params: {short_name: description.short_name}},
                        {key: "precision", params: {precision: precision}},
                        {key: "max_supply", params: {max_supply: max_supply}},
                        {key: "market_fee_percent", params: {market_fee_percent: market_fee_percent}},
                        {key: "max_market_fee", params: {max_market_fee: max_market_fee}},
                    {key: "cer", params: {}},
                        {key: "cer_base_amount", params: {cer_base_amount: cer_base_amount}},
                        {key: "cer_base_id", params: {cer_base_id: cer_base_asset_id}},
                        {key: "cer_quote_amount", params: {cer_quote_amount: cer_quote_amount}},
                        {key: "cer_quote_id", params: {cer_quote_id: cer_quote_asset_id}},
                        {key: "whitelist_authorities", params: {whitelist_authorities: whitelist_authorities}},
                        {key: "blacklist_authorities", params: {blacklist_authorities: blacklist_authorities}},
                        {key: "whitelist_markets", params: {whitelist_markets: whitelist_markets}},
                        {key: "blacklist_markets", params: {blacklist_markets: blacklist_markets}},
                        {key: "is_prediction_market", params: {is_prediction_market: is_prediction_market}},
                    {key: "permissions", params: {}},
                        {key: "perm_charge_market_fee", params: {charge_market_fee: issuer_permissions["charge_market_fee"]}},
                        {key: "perm_white_list", params: {white_list: issuer_permissions["white_list"]}},
                        {key: "perm_override_authority", params: {override_authority: issuer_permissions["override_authority"]}},
                        {key: "perm_transfer_restricted", params: {transfer_restricted: issuer_permissions["transfer_restricted"]}},
                        {key: "perm_disable_confidential", params: {disable_confidential: issuer_permissions["disable_confidential"]}},
                    {key: "flags", params: {}},
                        {key: "flag_charge_market_fee", params: {charge_market_fee: flags["charge_market_fee"]}},
                        {key: "flag_white_list", params: {white_list: flags["white_list"]}},
                        {key: "flag_override_authority", params: {override_authority: flags["override_authority"]}},
                        {key: "flag_transfer_restricted", params: {transfer_restricted: flags["transfer_restricted"]}},
                        {key: "flag_disable_confidential", params: {disable_confidential: flags["disable_confidential"]}},
                    {key: "bitasset", params: {}}
                ];
                
                if (isBitasset) {
                    tempRows = tempRows.concat([
                        {key: "bitasset_opts", params: {}},
                        {
                            key: "feed_lifetime_sec",
                            params: {feed_lifetime_sec: op.bitasset_opts.feed_lifetime_sec}
                        },
                        {
                            key: "force_settlement_delay_sec",
                            params: {force_settlement_delay_sec: op.bitasset_opts.force_settlement_delay_sec}
                        },
                        {
                            key: "force_settlement_offset_percent",
                            params: {force_settlement_offset_percent: op.bitasset_opts.force_settlement_offset_percent}
                        },
                        {
                            key: "maximum_force_settlement_volume",
                            params: {maximum_force_settlement_volume: op.bitasset_opts.maximum_force_settlement_volume}
                        },
                        {
                            key: "minimum_feeds",
                            params: {minimum_feeds: op.bitasset_opts.minimum_feeds}
                        },
                        {
                            key: "short_backing_asset",
                            params: {short_backing_asset: op.bitasset_opts.short_backing_asset}
                        }
                    ]);
                }

                if (nft_object) {
                    tempRows = tempRows.concat([
                        {key: "nft", params: {}},
                        {
                            key: "acknowledgements",
                            params: {acknowledgements: nft_object.acknowledgements}
                        },
                        {
                            key: "artist",
                            params: {artist: nft_object.artist}
                        },
                        {
                            key: "attestation",
                            params: {attestation: nft_object.attestation}
                        },
                        {
                            key: "holder_license",
                            params: {holder_license: nft_object.holder_license}
                        },
                        {
                            key: "license",
                            params: {license: nft_object.license}
                        },
                        {
                            key: "narrative",
                            params: {narrative: nft_object.narrative}
                        },
                        {
                            key: "title",
                            params: {title: nft_object.title}
                        },
                        {
                            key: "tags",
                            params: {tags: nft_object.tags}
                        },
                        {
                            key: "type",
                            params: {type: nft_object.type}
                        }
                    ]);
                }

                currentOperation['rows'] = tempRows;
            } else if (opType == 12) {
                // asset_update_bitasset
                let shortBackingAsset = assetResults.find((assRes) => assRes.id === op.new_options.short_backing_asset);

                if (!shortBackingAsset) {
                    console.log("shortBackingAsset issue");
                    return;
                }

                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {key: "issuer", params: {issuer: op.issuer}},
                        {key: "asset_to_update", params: {asset_to_update: op.asset_to_update}},
                    {key: "new_options", params: {}},
                        {key: "feed_lifetime_sec", params: {feed_lifetime_sec: op.new_options.feed_lifetime_sec}},
                        {key: "minimum_feeds", params: {minimum_feeds: op.new_options.minimum_feeds}},
                        {key: "force_settlement_delay_sec", params: {force_settlement_delay_sec: op.new_options.force_settlement_delay_sec}},
                        {key: "force_settlement_offset_percent", params: {force_settlement_offset_percent: op.new_options.force_settlement_offset_percent}},
                        {key: "maximum_force_settlement_volume", params: {maximum_force_settlement_volume: op.new_options.maximum_force_settlement_volume}},
                        {key: "short_backing_asset", params: {short_backing_asset: shortBackingAsset.symbol}},
                        op.new_options.extensions
                            ? {key: "extensions", params: {extensions: op.new_options.extensions}}
                            : {key: "noExtensions", params: {}},
                        {key: "fee", params: {fee: formatAsset(op.fee.amount, "BTS", 5), id: op.fee.asset_id }}
                ];
            } else if (opType == 13) {
                // asset_update_feed_producers
                let issuer = accountResults.find((resAcc) => resAcc.id === op.issuer).accountName;
                let assetToUpdate = assetResults.find((assRes) => assRes.id === op.new_options.short_backing_asset);

                if (!assetToUpdate) {
                    console.log("assetToUpdate issue");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {key: "issuer", params: {issuer: issuer, issuerOP: op.issuer}},
                        {key: "asset_to_update", params: {symbol: assetToUpdate.symbol, asset_to_update: op.asset_to_update}},
                    {key: "new_feed_producers", params: {new_feed_producers: JSON.stringify(op.new_feed_producers)}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 14) {
                // asset_issue
                //let issuer = accountResults.find((resAcc) => resAcc.id === op.issuer).accountName;
                let targetAccount = accountResults.find((resAcc) => resAcc.id === op.issue_to_account).accountName;
                let assetToIssue = assetResults.find((assRes) => assRes.id === op.asset_to_issue.asset_id);

                if (!assetToIssue) {
                    console.log("No asset to issue found");
                    return;
                }
                
                currentOperation['rows'] = [
                    {
                        key: "header",
                        params: {
                            amount: op.asset_to_issue.amount,
                            symbol: assetToIssue.symbol,
                            asset_id: op.asset_to_issue.asset_id,
                            to: targetAccount,
                            toID: op.issue_to_account
                        }
                    },
                    {key: "fee", params: {fee: JSON.stringify(op.fee).amount, id: op.fee.asset_id }}
                ];
            } else if (opType == 15) {
                // asset_reserve
                let payer = accountResults.find((resAcc) => resAcc.id === op.payer).accountName;
                let assetToReserve = assetResults.find((assRes) => assRes.id === op.amount_to_reserve.asset_id);

                if (!assetToReserve) {
                    console.log("assetToReserve issue");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {key: "payer", params: {payer: payer, payerOP: op.payer}},
                        {
                            key: "amount_to_reserve",
                            params: {
                                amount_to_reserve: formatAsset(
                                    op.amount_to_reserve.amount,
                                    assetToReserve.symbol,
                                    assetToReserve.precision
                                ),
                                asset_id: op.amount_to_reserve.asset_id
                            }
                        },
                        {
                            key: "extensions",
                            params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]" }
                        },
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 16) {
                // asset_fund_fee_pool
                let fromAccount = accountResults.find((resAcc) => resAcc.id === op.from_account).accountName;
                let assetToFund = assetResults.find((assRes) => assRes.id === op.asset_id);

                if (!assetToFund) {
                    console.log("assetToFund issue");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {key: "from_account", params: {from_account: fromAccount, from_accountOP: op.from_account}},
                        {
                            key: "asset",
                            params: {from_account: assetToFund.symbol, from_accountOP: op.asset_id}
                        },
                        { key: "amount", params: {amount: formatAsset(op.amount, assetToFund.symbol, assetToFund.precision)}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 17) {
                // asset_settle
                let account = accountResults.find((resAcc) => resAcc.id === op.account).accountName;
                let assetToSettle = assetResults.find((assRes) => assRes.id === op.amount.asset_id);

                if (!assetToSettle) {
                    console.log("assetToSettle issue");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {key: "account", params: {account: account, accountOP: op.account}},
                        {
                            key: "amount",
                            params: {
                                amount: formatAsset(
                                    op.amount.amount,
                                    assetToSettle.symbol,
                                    assetToSettle.precision
                                ),
                                assetID: op.amount.asset_id
                            }
                        },
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 18) {
                // asset_global_settle
                let issuer = accountResults.find((resAcc) => resAcc.id === op.account).accountName;

                let assetToSettle = assetResults.find((assRes) => assRes.id === op.asset_to_settle)
                let baseAsset = assetResults.find((assRes) => assRes.id === op.settle_price.base.asset_id);
                let quoteAsset = assetResults.find((assRes) => assRes.id === op.settle_price.quote.asset_id);

                if (!assetToSettle || !baseAsset || !quoteAsset) {
                    console.log("asset_global_settle param issue");
                    return;
                }

                let price = humanReadableFloat(op.settle_price.base.amount, baseAsset.precision)
                    / humanReadableFloat(op.settle_price.quote.amount, quoteAsset.precision);
                      
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {key: "issuer", params: {issuer: issuer, issuerOP: op.account}},
                        {
                            key: "asset_to_settle",
                            params: {
                                asset_to_settle: assetToSettle.symbol,
                                asset_to_settleOP: op.asset_to_settle
                            }
                        },
                        {key: "settle_price", params: {settle_price: price}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 19) {
                // asset_publish_feed
                let publisher = accountResults.find((resAcc) => resAcc.id === op.publisher).accountName;
                let baseAsset = assetResults.find((assRes) => assRes.id === op.settle_price.base.asset_id); // backing e.g. BTS
                let quoteAsset = assetResults.find((assRes) => assRes.id === op.settle_price.quote.asset_id); // same as asset_id

                if (!baseAsset || !quoteAsset) {
                    console.log("asset_publish_feed param issue");
                    return;
                }

                let coreExchangeRate = humanReadableFloat(op.feed.core_exchange_rate.base.amount, baseAsset.precision)
                / humanReadableFloat(op.feed.core_exchange_rate.quote.amount, quoteAsset.precision);

                let settlementPrice = humanReadableFloat(op.feed.settlement_price.base.amount, baseAsset.precision)
                / humanReadableFloat(op.feed.settlement_price.quote.amount, quoteAsset.precision);

                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {key: "publisher", params: {publisher: publisher, publisherOP: op.publisher}},
                        {
                            key: "asset_id",
                            params: {
                                symbol: quoteAsset.symbol,
                                asset_idOP: op.asset_id
                            }
                        },
                        {key: "feed", params: {}},
                            {key: "core_exchange_rate", params: {core_exchange_rate: coreExchangeRate}},
                            {key: "settlement_price", params: {settlement_price: settlementPrice}},
                            {key: "maintenance_collateral_ratio", params: {maintenance_collateral_ratio: op.feed.maintenance_collateral_ratio}},
                            {key: "maximum_short_squeeze_ratio", params: {maximum_short_squeeze_ratio: op.feed.maximum_short_squeeze_ratio}},
                        {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 20) {
                // witness_create
                let witnessAccount = accountResults.find((resAcc) => resAcc.id === op.witness_account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {
                            key: "witness_account",
                            params: {
                                witness_account: witnessAccount,
                                witness_accountOP: op.witness_account
                            }
                        },
                        {key: "url", params: {url: op.url}},
                        {key: "block_signing_key", params: {block_signing_key: op.block_signing_key}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 21) {
                // witness_update
                let witnessAccount = accountResults.find((resAcc) => resAcc.id === op.witness_account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {
                            key: "witness",
                            params: {
                                witness: op.witness,
                            }
                        },
                        {
                            key: "witness_account",
                            params: {
                                witness_account: witnessAccount,
                                witness_accountOP: op.witness_account
                            }
                        },
                        {key: "new_url", params: {new_url: op.new_url}},
                        {key: "new_signing_key", params: {new_signing_key: op.new_signing_key}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 22) {
                // proposal_create
                let feePayingAccount = accountResults.find((resAcc) => resAcc.id === op.fee_paying_account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {key: "expiration_time", params: {expiration_time: op.expiration_time}},
                        {key: "proposed_ops", params: {proposed_ops: JSON.stringify(op.proposed_ops)}},
                        {key: "review_period_seconds", params: {review_period_seconds: op.review_period_seconds}},
                        {
                            key: "fee_paying_account",
                            params: {
                                fee_paying_account: feePayingAccount,
                                fee_paying_accountOP: op.fee_paying_account
                            }
                        },
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 23) {
                // proposal_update
                let feePayingAccount = accountResults.find((resAcc) => resAcc.id === op.fee_paying_account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {key: "proposal", params: {proposal: op.proposal}},
                        {
                            key: "active_approvals_to_add", params: {active_approvals_to_add: JSON.stringify(op.active_approvals_to_add)}
                        },
                        {
                            key: "active_approvals_to_remove", params: {active_approvals_to_remove: JSON.stringify(op.active_approvals_to_remove)}
                        },
                        {
                            key: "owner_approvals_to_add", params: {owner_approvals_to_add: JSON.stringify(op.owner_approvals_to_add)}
                        },
                        {
                            key: "owner_approvals_to_remove", params: {owner_approvals_to_remove: JSON.stringify(op.owner_approvals_to_remove)}
                        },
                        {
                            key: "key_approvals_to_add", params: {key_approvals_to_add: JSON.stringify(op.key_approvals_to_add)}
                        },
                        {
                            key: "key_approvals_to_remove", params: {key_approvals_to_remove: JSON.stringify(op.key_approvals_to_remove)}
                        },
                        {
                            key: "fee_paying_account", params: {fee_paying_account: feePayingAccount, fee_paying_accountOP: op.fee_paying_account}
                        },
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 24) {
                // proposal_delete
                let feePayingAccount = accountResults.find((resAcc) => resAcc.id === op.fee_paying_account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {key: "using_owner_authority", params: {using_owner_authority: op.using_owner_authority}},
                        {key: "proposal", params: {proposal: op.proposal}},
                        {
                            key: "fee_paying_account", params: {fee_paying_account: feePayingAccount, fee_paying_accountOP: op.fee_paying_account}
                        },
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 25) {
                // withdraw_permission_create
                let to = accountResults.find((resAcc) => resAcc.id === op.authorized_account).accountName;
                let from = accountResults.find((resAcc) => resAcc.id === op.withdraw_from_account).accountName;
                let asset = assetResults.find((assRes) => assRes.id === op.withdrawal_limit.asset_id);

                if (!asset) {
                    console.log("withdraw_permission_create missing field");
                    return;
                }

                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {key: "recipient", params: {recipient: to, recipientOP: op.authorized_account}},
                        {key: "withdraw_from", params: {withdraw_from: from, withdraw_fromOP: op.withdraw_from_account}},
                        {
                            key: "taking",
                            params: {
                                amount: formatAsset(op.withdrawal_limit.amount, asset.symbol, asset.precision),
                                period_sec: op.withdrawal_period_sec,
                                period_qty: op.periods_until_expiration
                            }
                        },
                ];
            } else if (opType == 26) {
                // withdraw_permission_update
                let withdrawFromAccount = accountResults.find((resAcc) => resAcc.id === op.withdraw_from_account).accountName;
                let authorizedAccount = accountResults.find((resAcc) => resAcc.id === op.authorized_account).accountName;
                let withdrawalLimit = assetResults.find((assRes) => assRes.id === op.withdrawal_limit.asset_id);

                if (!withdrawalLimit) {
                    console.log("withdraw_permission_update missing field");
                    return;
                }

                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {
                            key: "withdraw_from_account",
                            params: {
                                withdraw_from_account: withdrawFromAccount,
                                withdraw_from_accountOP: op.withdraw_from_account
                            }
                        },
                        {
                            key: "authorized_account",
                            params: {
                                authorized_account: authorizedAccount,
                                authorized_accountOP: op.authorized_account
                            }
                        },
                        {key: "permission_to_update", params: {permission_to_update: op.permission_to_update}},
                        withdrawalLimit
                            ?   {
                                    key: "withdrawal_limited",
                                    params: {
                                        withdrawal_limit: formatAsset(op.withdrawal_limit.amount, withdrawalLimit.symbol, withdrawalLimit.precision)
                                    }
                                }
                            :   {
                                    key: "withdrawal_unlimited",
                                    params: {
                                        withdrawal_limit: op.withdrawal_limit.amount,
                                        withdrawal_limitOP: op.withdrawal_limit.asset_id
                                    }
                                },
                        {key: "withdrawal_period_sec", params: {withdrawal_period_sec: op.withdrawal_period_sec}},
                        {key: "period_start_time", params: {period_start_time: op.period_start_time}},
                        {key: "periods_until_expiration", params: {periods_until_expiration: op.periods_until_expiration}},
                        {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 27) {
                // withdraw_permission_claim
                let from = accountResults.find((resAcc) => resAcc.id === op.withdraw_from_account).accountName;
                let to = accountResults.find((resAcc) => resAcc.id === op.withdraw_to_account).accountName;
                let withdrawnAsset = assetResults.find((assRes) => assRes.id === op.amount_to_withdraw.asset_id);

                if (!withdrawnAsset) {
                    console.log("withdraw_permission_claim missing field");
                    return;
                }

                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {key: "withdraw_permission", params: {withdraw_permission: op.withdraw_permission}},
                        {
                            key: "withdraw_from_account",
                            params: {
                                withdraw_from_account: from ?? '',
                                withdraw_from_accountOP: op.withdraw_from_account
                            }
                        },
                        {
                            key: "withdraw_to_account",
                            params: {
                                withdraw_to_account: to ?? '',
                                withdraw_to_accountOP: op.withdraw_to_account
                            }
                        },
                        {
                            key: "amount_to_withdraw",
                            params: {
                                amount_to_withdraw: withdrawnAsset
                                    ?   formatAsset(op.amount_to_withdraw.amount, withdrawnAsset.symbol, withdrawnAsset.precision)
                                    :   op.amount_to_withdraw.amount,
                                amount_to_withdrawOP: op.amount_to_withdraw.asset_id
                            }
                        },
                        {key: "memo", params: {memo: op.memo}},
                        {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 28) {
                // withdraw_permission_delete
                let withdrawFromAccount = accountResults.find((resAcc) => resAcc.id === op.withdraw_from_account).accountName;
                let authorizedAccount = accountResults.find((resAcc) => resAcc.id === op.authorized_account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                        {
                            key: "withdraw_from_account",
                            params: {
                                withdraw_from_account: withdrawFromAccount,
                                withdraw_from_accountOP: op.withdraw_from_account
                            }  
                        },
                        {
                            key: "authorized_account",
                            params: {
                                authorized_account: authorizedAccount,
                                authorized_accountOP: op.authorized_account
                            }
                        },
                        {key: "withdrawal_permission", params: {withdrawal_permission: op.withdrawal_permission}},
                        {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 29) {
                // committee_member_create
                let committeeMemberAccount = accountResults.find((resAcc) => resAcc.id === op.committee_member_account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {
                        key: "committee_member_account",
                        params: {
                            committee_member_account: committeeMemberAccount,
                            committee_member_accountOP: op.committee_member_account
                        }
                    },
                    {key: "url", params: {url: op.url}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 30) {
                // committee_member_update
                let committeeMemberAccount = accountResults.find((resAcc) => resAcc.id === op.committee_member_account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "committee_member", params: {committee_member: op.committee_member}},
                    {
                        key: "committee_member_account",
                        params: {
                            committee_member_account: committeeMemberAccount,
                            committee_member_accountOP: op.committee_member_account
                        }
                    },
                    {key: "new_url", params: {new_url: op.new_url}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 31) {
                // committee_member_update_global_parameters
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "new_parameters", params: {}},
                        {
                            key: "current_fees",
                            params: {current_fees: JSON.stringify(op.new_parameters.current_fees)}
                        },
                        {key: "block_interval", params: {block_interval: op.block_interval}},
                        {key: "maintenance_interval", params: {maintenance_interval: op.maintenance_interval}},
                        {key: "maintenance_skip_slots", params: {maintenance_skip_slots: op.maintenance_skip_slots}},
                        {
                            key: "committee_proposal_review_period",
                            params: {committee_proposal_review_period: op.committee_proposal_review_period}
                        },
                        {key: "maximum_transaction_size", params: {maximum_transaction_size: op.maximum_transaction_size}},
                        {key: "maximum_block_size", params: {maximum_block_size: op.maximum_block_size}},
                        {
                            key: "maximum_time_until_expiration",
                            params: {maximum_time_until_expiration: op.maximum_time_until_expiration}
                        },
                        {key: "maximum_proposal_lifetime", params: {maximum_proposal_lifetime: op.maximum_proposal_lifetime}},
                        {key: "maximum_asset_whitelist_authorities", params: {maximum_asset_whitelist_authorities: op.maximum_asset_whitelist_authorities}},
                        {key: "maximum_asset_feed_publishers", params: {maximum_asset_feed_publishers: op.maximum_asset_feed_publishers}},
                        {key: "maximum_witness_count", params: {maximum_witness_count: op.maximum_witness_count}},
                        {key: "maximum_committee_count", params: {maximum_committee_count: op.maximum_committee_count}},
                        {key: "maximum_authority_membership", params: {maximum_authority_membership: op.maximum_authority_membership}},
                        {key: "reserve_percent_of_fee", params: {reserve_percent_of_fee: op.reserve_percent_of_fee}},
                        {key: "network_percent_of_fee", params: {network_percent_of_fee: op.network_percent_of_fee}},
                        {key: "lifetime_referrer_percent_of_fee", params: {lifetime_referrer_percent_of_fee: op.lifetime_referrer_percent_of_fee}},
                        {key: "cashback_vesting_period_seconds", params: {cashback_vesting_period_seconds: op.cashback_vesting_period_seconds}},
                        {key: "cashback_vesting_threshold", params: {cashback_vesting_threshold: op.cashback_vesting_threshold}},
                        {key: "count_non_member_votes", params: {count_non_member_votes: op.count_non_member_votes}},
                        {key: "allow_non_member_whitelists", params: {allow_non_member_whitelists: op.allow_non_member_whitelists}},
                        {key: "witness_pay_per_block", params: {witness_pay_per_block: op.witness_pay_per_block}},
                        {key: "worker_budget_per_day", params: {worker_budget_per_day: op.worker_budget_per_day}},
                        {key: "max_predicate_opcode", params: {max_predicate_opcode: op.max_predicate_opcode}},
                        {key: "fee_liquidation_threshold", params: {fee_liquidation_threshold: op.fee_liquidation_threshold}},
                        {key: "accounts_per_fee_scale", params: {accounts_per_fee_scale: op.accounts_per_fee_scale}},
                        {key: "account_fee_scale_bitshifts", params: {account_fee_scale_bitshifts: op.account_fee_scale_bitshifts}},
                        {key: "max_authority_depth", params: {max_authority_depth: op.max_authority_depth}},
                        {key: "extensions", params: {extensions: JSON.stringify(op.extensions)}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 32) {
                // vesting_balance_create
                let creator = accountResults.find((resAcc) => resAcc.id === op.creator).accountName;
                let owner = accountResults.find((resAcc) => resAcc.id === op.owner).accountName;
                let amount = assetResults.find((assRes) => assRes.id === op.amount.asset_id);

                if (!amount) {
                    console.log("vesting_balance_create: amount is null");
                    return;
                }
                
                let tempRows = [
                    {key: "header", params: {}},
                    {key: "creator", params: {creator: creator, creatorOP: op.creator}},
                    {key: "owner", params: {owner: owner, ownerOP: op.owner}},
                    {
                        key: "amount",
                        params: {
                            amount: formatAsset(op.amount.amount, amount.symbol, amount.precision),
                            amount_id: op.amount.asset_id
                        }
                    },
                    {key: "policy", params: {}}
                ];

                let policy = op.policy;
                if (policy[0] == 0) {
                    tempRows.push({key: "begin_timestamp", params: {begin_timestamp: policy[1].begin_timestamp}})
                    tempRows.push({key: "vesting_cliff_seconds", params: {vesting_cliff_seconds: policy[1].vesting_cliff_seconds}})
                    tempRows.push({key: "vesting_duration_seconds", params: {vesting_duration_seconds: policy[1].vesting_duration_seconds}})
                } else {
                    tempRows.push({key: "start_claim", params: {start_claim: policy[1].start_claim}})
                    tempRows.push({key: "vesting_seconds", params: {vesting_seconds: policy[1].vesting_seconds}})
                }

                tempRows.push({key: "fee", params: {fee: JSON.stringify(op.fee) }})
                currentOperation['rows'] = tempRows;
            } else if (opType == 33) {
                // vesting_balance_withdraw
                let owner = accountResults.find((resAcc) => resAcc.id === op.owner).accountName;
                let asset = assetResults.find((assRes) => assRes.id === op.amount.asset_id);

                if (!asset) {
                    console.log("vesting_balance_withdraw: asset is null");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "owner", params: {owner: owner, ownerOP: op.owner}},
                    {
                        key: "claim",
                        params: {
                            claim: formatAsset(op.amount.amount, asset.symbol, asset.precision),
                            asset_id: op.amount.asset_id
                        }
                    },
                ];
            } else if (opType == 34) {
                // worker_create
                let owner = accountResults.find((resAcc) => resAcc.id === op.owner).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "owner", params: {owner: owner, ownerOP: op.owner}},
                    {key: "work_begin_date", params: {work_begin_date: op.work_begin_date}},
                    {key: "work_end_date", params: {work_end_date: op.work_end_date}},
                    {key: "daily_pay", params: {daily_pay: op.daily_pay}},
                    {key: "name", params: {name: op.name}},
                    {key: "url", params: {url: op.url}},
                    {key: "initializer", params: {initializer: JSON.stringify(op.initializer)}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 35) {
                // custom
                let payer = accountResults.find((resAcc) => resAcc.id === op.payer).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "payer", params: {payer: payer, payerOP: op.payer}},
                    {key: "required_auths", params: {required_auths: JSON.stringify(op.required_auths)}},
                    {key: "id", params: {id: op.id}},
                    {key: "data", params: {data: JSON.stringify(op.data)}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 36) {
                // assert
                let feePayingAccount = accountResults.find((resAcc) => resAcc.id === op.fee_paying_account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {
                        key: "fee_paying_account",
                        params: {
                            fee_paying_account: feePayingAccount,
                            fee_paying_accountOP: op.fee_paying_account
                        }
                    },
                    {key: "predicates", params: {predicates: JSON.stringify(op.predicates)}},
                    {key: "required_auths", params: {required_auths: JSON.stringify(op.required_auths)}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 37) {
                // balance_claim
                let depositToAccount = accountResults.find((resAcc) => resAcc.id === op.deposit_to_account).accountName;
                let claimedAsset = assetResults.find((assRes) => assRes.id === op.amount.asset_id);

                if (!claimedAsset) {
                    console.log("balance_claim: claimedAsset is null");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {
                        key: "deposit_to_account",
                        params: {
                            deposit_to_account: depositToAccount,
                            deposit_to_accountOP: op.deposit_to_account
                        }
                    },
                    {key: "balance_to_claim", params: {balance_to_claim: op.balance_to_claim}},
                    {key: "balance_owner_key", params: {balance_owner_key: op.balance_owner_key}},
                    {
                        key: "total_claimed",
                        params: {
                            total_claimed: formatAsset(op.amount.amount, claimedAsset.symbol, claimedAsset.precision),
                            asset_id: op.amount.asset_id
                        }
                    },
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 38) {
                // override_transfer
                let issuer = accountResults.find((resAcc) => resAcc.id === op.issuer).accountName;
                let from = accountResults.find((resAcc) => resAcc.id === op.from).accountName;
                let to = accountResults.find((resAcc) => resAcc.id === op.to).accountName;
                let overridenAsset = assetResults.find((assRes) => assRes.id === op.amount.asset_id);

                if (!overridenAsset) {
                    console.log("override_transfer: overridenAsset is null");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "issuer", params: {issuer: issuer, issuerOP: op.issuer}},
                    {key: "from", params: {from: from, fromOP: op.from}},
                    {key: "to", params: {to: to, toOP: op.to}},
                    {
                        key: "amount",
                        params: {
                            amount: formatAsset(op.amount.amount, overridenAsset.symbol, overridenAsset.precision),
                            asset_id: op.amount.asset_id
                        }
                    },
                    {key: "memo", params: {memo: op.memo}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 39) {
                // transfer_to_blind
                let from = accountResults.find((resAcc) => resAcc.id === op.from).accountName;
                let assetToTransfer = assetResults.find((assRes) => assRes.id === op.amount.asset_id);

                if (!assetToTransfer) {
                    console.log("transfer_to_blind: assetToTransfer is null");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {
                        key: "amount",
                        params: {
                            amount: formatAsset(op.amount.amount, assetToTransfer.symbol, assetToTransfer.precision),
                        }
                    },
                    {key: "from", params: {from: from, fromOP: op.from}},
                    {key: "blinding_factor", params: {blinding_factor: op.blinding_factor}},
                    {key: "outputs", params: {outputs: JSON.stringify(op.outputs)}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 40) {
                // blind_transfer
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "inputs", params: {inputs: JSON.stringify(op.inputs)}},
                    {key: "outputs", params: {outputs: JSON.stringify(op.outputs)}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 41) {
                // transfer_from_blind
                let to = accountResults.find((resAcc) => resAcc.id === op.to).accountName;
                let assetToTransfer = assetResults.find((assRes) => assRes.id === op.amount.asset_id);

                if (!assetToTransfer) {
                    console.log("transfer_from_blind: assetToTransfer is null");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {
                        key: "amount",
                        params: {
                            amount: formatAsset(op.amount.amount, assetToTransfer.symbol, assetToTransfer.precision),
                        }
                    },
                    {key: "to", params: {to: to, toOP: op.to}},
                    {key: "blinding_factor", params: {blinding_factor: op.blinding_factor}},
                    {key: "inputs", params: {inputs: JSON.stringify(op.inputs)}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 43) {
                // asset_claim_fees
                let issuer = accountResults.find((resAcc) => resAcc.id === op.issuer).accountName;
                let assetToClaim = assetResults.find((assRes) => assRes.id === op.amount_to_claim.asset_id);

                if (!assetToClaim) {
                    console.log("asset_claim_fees: assetToClaim is null");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "issuer", params: {issuer: issuer, issuerOP: op.issuer}},
                    {
                        key: "amount_to_claim",
                        params: {
                            amount_to_claim: formatAsset(op.amount_to_claim.amount, assetToClaim.symbol, assetToClaim.precision),
                            asset_id: op.amount_to_claim.asset_id
                        }
                    },
                    {key: "extensions", params: {extensions: JSON.stringify(op.extensions)}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 45) {
                // bid_collateral
                let bidder = accountResults.find((resAcc) => resAcc.id === op.bidder).accountName;
                let collateral = assetResults.find((assRes) => assRes.id === op.additional_collateral.asset_id);
                let debtCovered = assetResults.find((assRes) => assRes.id === op.debtCovered.asset_id);

                if (!collateral || !debtCovered) {
                    console.log("bid_collateral: collateral or debtCovered is null");
                    return;
                }

                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "bidder", params: {bidder: bidder, bidderOP: op.bidder}},
                    {
                        key: "additional_collateral",
                        params: {
                            additional_collateral: formatAsset(op.additional_collateral.amount, collateral.symbol, collateral.precision),
                        }
                    },
                    {
                        key: "debt_covered",
                        params: {
                            debt_covered: formatAsset(op.debt_covered.amount, debtCovered.symbol, debtCovered.precision),
                        }
                    },
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 47) {
                // asset_claim_pool
                let issuer = accountResults.find((resAcc) => resAcc.id === op.issuer).accountName;
                let relevantAsset = assetResults.find((assRes) => assRes.id === op.asset_id);

                if (!relevantAsset) {
                    console.log("asset_claim_pool: relevantAsset is null");
                    return;
                }

                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "issuer", params: {issuer: issuer, issuerOP: op.issuer}},
                    {key: "asset_id", params: {asset_id: op.asset_id}},
                    {
                        key: "amount_to_claim",
                        params: {
                            amount_to_claim: formatAsset(op.amount_to_claim.amount, relevantAsset.symbol, relevantAsset.precision),
                        }
                    },
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 48) {
                // asset_update_issuer
                let issuer = accountResults.find((resAcc) => resAcc.id === op.issuer).accountName;
                let new_issuer = accountResults.find((resAcc) => resAcc.id === op.new_issuer).accountName;
                let assetToUpdate = assetResults.find((assRes) => assRes.id === op.asset_to_update);

                if (!assetToUpdate) {
                    console.log("asset_update_issuer: assetToUpdate is null");
                    return;
                }

                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "issuer", params: {issuer: issuer, issuerOP: op.issuer}},
                    {key: "asset_to_update", params: {asset_to_update: assetToUpdate.symbol}},
                    {key: "new_issuer", params: {new_issuer: new_issuer, new_issuerOP: op.new_issuer}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 49) {
                // htlc_create
                let from = accountResults.find((resAcc) => resAcc.id === op.from).accountName;
                let to = accountResults.find((resAcc) => resAcc.id === op.to).accountName;
                let htlcAsset = assetResults.find((assRes) => assRes.id === op.amount.asset_id);

                if (!htlcAsset) {
                    console.log("htlc_create: htlcAsset is null");
                    return;
                }

                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "from", params: {from: from, fromOP: op.from}},
                    {key: "to", params: {to: to, toOP: op.to}},
                    {
                        key: "amount",
                        params: {
                            amount: formatAsset(op.amount.amount, htlcAsset.symbol, htlcAsset.precision),
                        }
                    },
                    {key: "preimage_hash", params: {preimage_hash: op.preimage_hash}},
                    {key: "preimage_size", params: {preimage_size: op.preimage_size}},
                    {key: "claim_period_seconds", params: {claim_period_seconds: op.claim_period_seconds}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 50) {
                // htlc_redeem
                let redeemer = accountResults.find((resAcc) => resAcc.id === op.redeemer).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "htlc_id", params: {htlc_id: op.htlc_id}},
                    {key: "redeemer", params: {redeemer: redeemer, redeemerOP: op.redeemer}},
                    {key: "preimage", params: {preimage: op.preimage}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 52) {
                // htlc_extend
                let update_issuer = accountResults.find((resAcc) => resAcc.id === op.update_issuer).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "htlc_id", params: {htlc_id: op.htlc_id}},
                    {key: "update_issuer", params: {update_issuer: update_issuer, update_issuerOP: op.update_issuer}},
                    {key: "seconds_to_add", params: {seconds_to_add: op.seconds_to_add}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 54) {
                // custom_authority_create
                let account = accountResults.find((resAcc) => resAcc.id === op.account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "account", params: {account: account, accountOP: op.account}},
                    {key: "enabled", params: {enabled: op.enabled}},
                    {key: "valid_from", params: {valid_from: op.valid_from}},
                    {key: "valid_to", params: {valid_to: op.valid_to}},
                    {key: "operation_type", params: {operation_type: op.operation_type}},
                    {key: "auth", params: {auth: JSON.stringify(op.auth)}},
                    {key: "restrictions", params: {restrictions: JSON.stringify(op.restrictions)}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 55) {
                // custom_authority_update
                let account = accountResults.find((resAcc) => resAcc.id === op.account).accountName;

                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "account", params: {account: account, accountOP: op.account}},
                    {key: "authority_to_update", params: {authority_to_update: op.authority_to_update}},
                    {key: "new_enabled", params: {new_enabled: op.new_enabled}},
                    {key: "new_valid_from", params: {new_valid_from: op.new_valid_from}},
                    {key: "new_valid_to", params: {new_valid_to: op.new_valid_to}},
                    {key: "new_auth", params: {new_auth: JSON.stringify(op.new_auth)}},
                    {key: "restrictions_to_remove", params: {restrictions_to_remove: JSON.stringify(op.restrictions_to_remove)}},
                    {key: "restrictions_to_add", params: {restrictions_to_add: JSON.stringify(op.restrictions_to_add)}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 56) {
                // custom_authority_delete
                let account = accountResults.find((resAcc) => resAcc.id === op.account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "account", params: {account: account, accountOP: op.account}},
                    {key: "authority_to_delete", params: {authority_to_delete: op.authority_to_delete}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 57) {
                // ticket_create
                let account = accountResults.find((resAcc) => resAcc.id === op.account).accountName;
                let ticketAsset = assetResults.find((assRes) => assRes.id === op.amount.asset_id);

                if (!ticketAsset) {
                    console.log("ticket_create: ticketAsset is null");
                    return;
                }

                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "account", params: {account: account, accountOP: op.account}},
                    {key: "target_type", params: {target_type: op.target_type}},
                    {key: "amount", params: {amount: formatAsset(op.amount.amount, ticketAsset.symbol, ticketAsset.precision)}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 58) {
                // ticket_update
                let account = accountResults.find((resAcc) => resAcc.id === op.account).accountName;
                let ticketAsset = assetResults.find((assRes) => assRes.id === op.amount_for_new_target.asset_id);

                if (!ticketAsset) {
                    console.log("ticket_update: ticketAsset is null");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "ticket", params: {ticket: op.ticket}},
                    {key: "account", params: {account: account, accountOP: op.account}},
                    {key: "target_type", params: {target_type: op.target_type}},
                    {key: "amount_for_new_target", params: {amount_for_new_target: formatAsset(op.amount_for_new_target.amount, ticketAsset.symbol, ticketAsset.precision)}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                ];
            } else if (opType == 59) {
                // liquidity_pool_create
                let account = accountResults.find((resAcc) => resAcc.id === op.account).accountName;
                let assetA = assetResults.find((assRes) => assRes.id === op.asset_a);
                let assetB = assetResults.find((assRes) => assRes.id === op.asset_b);
                let shareAsset = assetResults.find((assRes) => assRes.id === op.share_asset);

                if (!assetA || !assetB || !shareAsset) {
                    console.log("liquidity_pool_create: assetA, assetB or shareAsset is null");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "account", params: {account: account, accountOP: op.account}},
                    {key: "asset_a", params: {asset_a: assetA.symbol, asset_aOP: op.asset_a}},
                    {key: "asset_b", params: {asset_b: assetB.symbol, asset_bOP: op.asset_b}},
                    {key: "share_asset", params: {share_asset: shareAsset.symbol, share_assetOP: op.share_asset}},
                    {key: "taker_fee_percent", params: {taker_fee_percent: op.taker_fee_percent}},
                    {key: "withdrawal_fee_percent", params: {withdrawal_fee_percent: op.withdrawal_fee_percent}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 60) {
                // liquidity_pool_delete
                let account = accountResults.find((resAcc) => resAcc.id === op.account).accountName;
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "account", params: {account: account, accountOP: op.account}},
                    {key: "pool_id", params: {pool_id: op.pool}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 61) {
                // liquidity_pool_deposit
                let account = accountResults.find((resAcc) => resAcc.id === op.account).accountName;
                let amountA = assetResults.find((assRes) => assRes.id === op.amount_a.asset_id);
                let amountB = assetResults.find((assRes) => assRes.id === op.amount_b.asset_id);

                if (!amountA || !amountB) {
                    console.log("liquidity_pool_deposit: amountA or amountB is null");
                    return;
                }

                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "account", params: {account: account, accountOP: op.account}},
                    {key: "pool", params: {pool: op.pool}},
                    {
                        key: "amount_a",
                        params: {
                            amount_a: formatAsset(op.amount_a.amount, amountA.symbol, amountA.precision),
                            amount_aOP: op.amount_a.asset_id                            
                        }
                    },
                    {
                        key: "amount_b",
                        params: {
                            amount_b: formatAsset(op.amount_b.amount, amountB.symbol, amountB.precision),
                            amount_bOP: op.amount_b.asset_id
                        }
                    },
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 62) {
                // liquidity_pool_withdraw
                let account = accountResults.find((resAcc) => resAcc.id === op.account).accountName;
                let shareAsset = assetResults.find((assRes) => assRes.id === op.share_amount.asset_id);

                if (!shareAsset) {
                    console.log("liquidity_pool_withdraw: shareAsset is null");
                    return;
                }

                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "account", params: {account: account, accountOP: op.account}},
                    {key: "pool", params: {pool: op.pool}},
                    {
                        key: "share_amount",
                        params: {
                            share_amount: formatAsset(op.share_amount.amount, shareAsset.symbol, shareAsset.precision),
                            share_amountOP: op.share_amount.asset_id
                        }
                    },
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 63) {
                // liquidity_pool_exchange
                let account = accountResults.find((resAcc) => resAcc.id === op.account).accountName;
                let soldAsset = assetResults.find((assRes) => assRes.id === op.amount_to_sell.asset_id);
                let receivedAsset = assetResults.find((assRes) => assRes.id === op.min_to_receive.asset_id);

                if (!soldAsset || !receivedAsset) {
                    console.log("liquidity_pool_exchange: soldAsset or receivedAsset is null");
                    return;
                }

                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "account", params: {account: account, accountOP: op.account}},
                    {key: "pool", params: {pool: op.pool}},
                    {
                        key: "amount_to_sell",
                        params: {
                            amount_to_sell: formatAsset(op.amount_to_sell.amount, soldAsset.symbol, soldAsset.precision),
                        }
                    },
                    {
                        key: "min_to_receive",
                        params: {
                            min_to_receive: formatAsset(op.min_to_receive.amount, receivedAsset.symbol, receivedAsset.precision),
                        }
                    },
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee)}}
                ];
            } else if (opType == 64) {
                // samet_fund_create
                let ownerAccount = accountResults.find((resAcc) => resAcc.id === op.owner_account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "owner_account", params: {owner_account: ownerAccount, owner_accountOP: op.owner_account}},
                    {key: "asset_type", params: {asset_type: op.asset_type}},
                    {key: "balance", params: {balance: op.balance}},
                    {key: "fee_rate", params: {fee_rate: op.fee_rate}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 65) {
                // samet_fund_delete
                let ownerAccount = accountResults.find((resAcc) => resAcc.id === op.owner_account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "owner_account", params: {owner_account: ownerAccount, owner_accountOP: op.owner_account}},
                    {key: "fund_id", params: {fund_id: op.fund_id}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 66) {
                // samet_fund_update
                let ownerAccount = accountResults.find((resAcc) => resAcc.id === op.owner_account).accountName;

                let deltaAmount = op.delta_amount
                    ? assetResults.find((assRes) => assRes.id === op.delta_amount.asset_id)
                    : null;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "owner_account", params: {owner_account: ownerAccount, owner_accountOP: op.owner_account}},
                    {key: "fund_id", params: {fund_id: op.fund_id}},
                    {
                        key: "delta_amount",
                        params: {
                            delta_amount: deltaAmount ? formatAsset(op.delta_amount.amount, deltaAmount.symbol, deltaAmount.precision) : '{}',
                        }
                    },
                    {key: "new_fee_rate", params: {new_fee_rate: op.new_fee_rate}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 67) {
                // samet_fund_borrow
                let borrower = accountResults.find((resAcc) => resAcc.id === op.borrower).accountName;
                let borrowAmount = assetResults.find((assRes) => assRes.id === op.borrow_amount.asset_id);

                if (!borrowAmount) {
                    console.log("samet_fund_borrow: borrowAmount is null");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "borrower", params: {borrower: borrower, borrowerOP: op.borrower}},
                    {key: "fund_id", params: {fund_id: op.fund_id}},
                    {
                        key: "borrow_amount",
                        params: {
                            borrow_amount: formatAsset(op.borrow_amount.amount, borrowAmount.symbol, borrowAmount.precision),
                        }
                    },
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 68) {
                // samet_fund_repay
                let account = accountResults.find((resAcc) => resAcc.id === op.account).accountName;
                let repayAmount = assetResults.find((assRes) => assRes.id === op.repay_amount.asset_id);
                let fundFee = assetResults.find((assRes) => assRes.id === op.fund_fee.asset_id);

                if (!repayAmount || !fundFee) {
                    console.log("samet_fund_repay: repayAmount or fundFee is null");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "account", params: {account: account, accountOP: op.account}},
                    {key: "fund_id", params: {fund_id: op.fund_id}},
                    {
                        key: "repay_amount",
                        params: {
                            repay_amount: formatAsset(op.repay_amount.amount, repayAmount.symbol, repayAmount.precision),
                        }
                    },
                    {
                        key: "fund_fee",
                        params: {
                            fund_fee: formatAsset(op.fund_fee.amount, fundFee.symbol, fundFee.precision),
                        }
                    },
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 69) {
                // credit_offer_create
                let ownerAccount = accountResults.find((resAcc) => resAcc.id === op.owner_account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "owner_account", params: {owner_account: ownerAccount, owner_accountOP: op.owner_account}},
                    {key: "asset_type", params: {asset_type: op.asset_type}},
                    {key: "balance", params: {balance: op.balance}},
                    {key: "fee_rate", params: {fee_rate: op.fee_rate}},
                    {key: "max_duration_seconds", params: {max_duration_seconds: op.max_duration_seconds}},
                    {key: "min_deal_amount", params: {min_deal_amount: op.min_deal_amount}},
                    {key: "enabled", params: {enabled: op.enabled}},
                    {key: "auto_disable_time", params: {auto_disable_time: op.auto_disable_time}},
                    {key: "acceptable_collateral", params: {acceptable_collateral: JSON.stringify(op.acceptable_collateral)}},
                    {key: "acceptable_borrowers", params: {acceptable_borrowers: JSON.stringify(op.acceptable_borrowers)}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 70) {
                // credit_offer_delete
                let ownerAccount = accountResults.find((resAcc) => resAcc.id === op.owner_account).accountName;
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "owner_account", params: {owner_account: ownerAccount, owner_accountOP: op.owner_account}},
                    {key: "offer_id", params: {offer_id: op.offer_id}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 71) {
                // credit_offer_update
                let ownerAccount = accountResults.find((resAcc) => resAcc.id === op.owner_account).accountName;

                let deltaAmount = op.delta_amount
                    ? assetResults.find((assRes) => assRes.id === op.delta_amount.asset_id)
                    : null;

                if (!deltaAmount) {
                    console.log("credit_offer_update: deltaAmount is null");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "owner_account", params: {owner_account: ownerAccount, owner_accountOP: op.owner_account}},
                    {key: "offer_id", params: {offer_id: op.offer_id}},
                    {
                        key: "delta_amount",
                        params: {
                            delta_amount: formatAsset(op.delta_amount.amount, deltaAmount.symbol, deltaAmount.precision),
                        }
                    },
                    {key: "fee_rate", params: {fee_rate: op.fee_rate}},
                    {key: "max_duration_seconds", params: {max_duration_seconds: op.max_duration_seconds}},
                    {key: "min_deal_amount", params: {min_deal_amount: op.min_deal_amount}},
                    {key: "enabled", params: {enabled: op.enabled}},
                    {key: "auto_disable_time", params: {auto_disable_time: op.auto_disable_time}},
                    {key: "acceptable_collateral", params: {acceptable_collateral: JSON.stringify(op.acceptable_collateral)}},
                    {key: "acceptable_borrowers", params: {acceptable_borrowers: JSON.stringify(op.acceptable_borrowers)}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 72) {
                // credit_offer_accept
                let borrower = accountResults.find((resAcc) => resAcc.id === op.borrower).accountName;
                let borrowAmount = assetResults.find((assRes) => assRes.id === op.borrow_amount.asset_id);
                let collateral = assetResults.find((assRes) => assRes.id === op.collateral.asset_id);

                if (!borrowAmount || !collateral) {
                    console.log("credit_offer_accept: borrowAmount or collateral is null");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "borrower", params: {borrower: borrower, borrowerOP: op.borrower}},
                    {key: "offer_id", params: {offer_id: op.offer_id}},
                    {
                        key: "borrow_amount",
                        params: {
                            borrow_amount: formatAsset(op.borrow_amount.amount, borrowAmount.symbol, borrowAmount.precision),
                        }
                    },
                    {
                        key: "collateral",
                        params: {
                            collateral: formatAsset(op.collateral.amount, collateral.symbol, collateral.precision),
                        }
                    },
                    {key: "max_fee_rate", params: {max_fee_rate: op.max_fee_rate}},
                    {key: "min_duration_seconds", params: {min_duration_seconds: op.min_duration_seconds}},
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            } else if (opType == 73) {
                // credit_deal_repay
                let account = accountResults.find((resAcc) => resAcc.id === op.account).accountName;
                let repayAmount = assetResults.find((assRes) => assRes.id === op.repay_amount.asset_id);
                let creditFee = assetResults.find((assRes) => assRes.id === op.credit_fee.asset_id);

                if (!repayAmount || !creditFee) {
                    console.log("credit_deal_repay: repayAmount or creditFee is null");
                    return;
                }
                
                currentOperation['rows'] = [
                    {key: "header", params: {}},
                    {key: "account", params: {account: account, accountOP: op.account}},
                    {key: "deal_id", params: {deal_id: op.deal_id}},
                    {
                        key: "repay_amount",
                        params: {
                            repay_amount: formatAsset(op.repay_amount.amount, repayAmount.symbol, repayAmount.precision),
                        }
                    },
                    {
                        key: "credit_fee",
                        params: {
                            credit_fee: formatAsset(op.credit_fee.amount, creditFee.symbol, creditFee.precision),
                        }
                    },
                    {key: "extensions", params: {extensions: op.extensions ? JSON.stringify(op.extensions) : "[]"}},
                    {key: "fee", params: {fee: JSON.stringify(op.fee) }}
                ];
            }

            operations.push(currentOperation);
        }

        return operations;
    }

}