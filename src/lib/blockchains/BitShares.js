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
          console.log("established connection:", res[0].network);
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
                        if (assets[i].issuer == "1.2.0") {
                            balances[i] = {
                                asset_type: account.balances[i].asset_type,
                                asset_name: assets[i].symbol,
                                balance: account.balances[i].balance,
                                owner: assets[i].issuer,
                                prefix: "BIT"
                            };
                        } else {
                            balances[i] = {
                                asset_type: account.balances[i].asset_type,
                                asset_name: assets[i].symbol,
                                rawbalance: account.balances[i].balance,
                                balance: account.balances[i].balance /
                                    Math.pow(10, assets[i].precision),
                                owner: assets[i].issuer,
                                prefix: ""
                            };
                        }
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
            tr = this._parseTransactionBuilder(thing);
        } catch (error) {
            console.log(error);
            return;
        }

        //  https://github.com/bitshares/bitsharesjs/blob/master/lib/serializer/src/operations.js#L1551
        for (let i = 0; i < tr.operations.length; i++) {
            let operation = tr.operations[i];
            const opType = operation[0];
            const op = operation[1];

            if (opType == 0) {
                // transfer
                let from;
                try {
                  from = await this._getAccountName(op.from);
                } catch (error) {
                  console.log(error);
                  return;
                }

                let to;
                try {
                  to = await this._getAccountName(op.to);
                } catch (error) {
                  console.log(error);
                  return;
                }

                let asset;
                try {
                  asset = await this._resolveAsset(op.amount.asset_id);
                } catch (error) {
                  console.log(error);
                  return;
                }

                if (!asset) {
                    console.log('Asset not found');
                    return;
                }

                let opStr = "Transfer request:\n";
                opStr += " from: " + from + "(" + op.from + ")\n";
                opStr += " to: " + to + "(" + op.to + ")\n";
                opStr += " amount: " + formatAsset(op.amount.amount, asset.symbol, asset.precision);
                operations.push(opStr);
            } else if (opType == 1) {
                // limit_order_create
                console.log('limit_order_create 1')
                let seller;
                try {
                  seller = await this._getAccountName(op.seller);
                } catch (error) {
                  console.log(error);
                  return;
                }

                let buy;
                try {
                  buy = await this._resolveAsset(op.min_to_receive.asset_id);
                } catch (error) {
                  console.log(error);
                }

                let sell;
                try {
                  sell = await this._resolveAsset(op.amount_to_sell.asset_id);
                } catch (error) {
                  console.log(error);
                }

                if (!buy || !sell) {
                    console.log('Could not resolve assets in limit_order_create');
                    return;
                }

                let fillOrKill = op.amount_to_sell.fill_or_kill;

                let price = humanReadableFloat(op.amount_to_sell.amount, sell.precision)
                    / humanReadableFloat(op.min_to_receive.amount, buy.precision);
                
                let opStr = "Trade request:\n"
                opStr += "Trade" + (fillOrKill ? "(Fill or Kill)" : "") + "\n"
                opStr += " Sell: " + formatAsset(op.amount_to_sell.amount, sell.symbol, sell.precision) + "\n"
                opStr += " Buy: " + formatAsset(op.min_to_receive.amount, buy.symbol, buy.precision) + "\n"
                opStr += " Price: " + price.toPrecision(6) + " " + sell.symbol + "/" +  buy.symbol
                operations.push(opStr);
            } else if (opType == 2) {
                // limit_order_cancel
                let feePayingAccount;
                try {
                    feePayingAccount = await this._getAccountName(op.fee_paying_account);
                } catch (error) {
                    console.log(error);
                }
                
                let opStr = "Cancel the following limit order?\n";
                opStr += "Order ID: " + op.order + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee) + "\n";
                opStr += "Fee paying account: " + feePayingAccount ?? '' + " (" + op.fee_paying_account + ")";
                operations.push(opStr);
            } else if (opType == 3) {
                // call_order_update
                let fundingAccount;
                try {
                    fundingAccount = await this._getAccountName(op.funding_account);
                } catch (error) {
                    console.log(error);
                }

                let deltaCollateral;
                try {
                    deltaCollateral = await this._resolveAsset(op.delta_collateral.asset_id);
                } catch (error) {
                    console.log(error);
                    return;
                }

                let deltaDebt;
                try {
                    deltaDebt = await this._resolveAsset(op.delta_debt.asset_id);
                } catch (error) {
                    console.log(error);
                    return;
                }

                if (!deltaCollateral || !deltaDebt) {
                    console.log('Could not resolve delta fields');
                    return;
                }
                
                let opStr = "Update your call order to the following?\n";
                opStr += "funding_account: " + fundingAccount ?? '' + " (" + op.funding_account + ")\n";
                opStr += "delta_collateral: " + formatAsset(op.delta_collateral.amount, deltaCollateral.symbol, deltaCollateral.precision) + " (" + op.delta_collateral.asset_id + ")\n";
                opStr += "delta_debt: " + formatAsset(op.delta_debt.amount, deltaDebt.symbol, deltaDebt.precision) + "(" + op.delta_debt.asset_id + ")\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 5) {
                // account_create

                let registrar;
                try {
                    registrar = await this._getAccountName(op.registrar);
                } catch (error) {
                    console.log(error);
                }

                let referrer;
                try {
                    referrer = await this._getAccountName(op.referrer);
                } catch (error) {
                    console.log(error);
                }
                
                let opStr = "Do you want to create the following account? \n";
                opStr += "registrar: " + registrar ?? '' + "(" + op.registrar + ")\n";
                opStr += "referrer: " + referrer ?? '' + "(" + op.referrer + ")\n";
                opStr += "referrer_percent: " + op.referrer_percent + "\n";
                opStr += "name " + op.name + "\n";
                opStr += "Owner: \n";
                opStr += "  weight_threshold: " + op.owner.weight_threshold + "\n";
                opStr += "  account_auths: " + JSON.stringify([{"1.2.x": 1}]) + "\n";
                opStr += "  key_auths: " + JSON.stringify([{"1.2.x": 1}]) + "\n";
                opStr += "  address_auths: " + JSON.stringify([{"1.2.x": 1}]) + "\n";
                opStr += "Active: \n";
                opStr += "  weight_threshold: " + op.active.weight_threshold + "\n";
                opStr += "  account_auths: " + JSON.stringify([{"1.2.x": 1}]) + "\n";
                opStr += "  key_auths: " + JSON.stringify([{"1.2.x": 1}]) + "\n";
                opStr += "  address_auths: " + JSON.stringify([{"1.2.x": 1}]) + "\n";
                opStr += "Options: \n";
                opStr += "  memo_key: " + op.options.memo_key + "\n";
                opStr += "  voting_account: " + op.options.voting_account + "\n";
                opStr += "  num_witness: " + op.options.num_witness + "\n";
                opStr += "  num_committee: " + op.options.num_committee + "\n";
                opStr += "  votes: " + JSON.stringify(op.options.votes) + "\n";
                opStr += "  extensions: " + JSON.stringify(op.options.extensions) + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee)
                operations.push(opStr);
            } else if (opType == 6) {
                // account_update
                let targetAccount;
                try {
                    targetAccount = await this._getAccountName(op.account);
                } catch (error) {
                    console.log(error);
                }
                
                let opStr = "Do you want to update the following account? \n";
                opStr += "Warning: This action is irreversible! \n";
                opStr += "account:" + targetAccount + "(" + op.account + ")\n";
                opStr += "owner:" + JSON.stringify(op.owner) + "\n";
                opStr += "active:" + JSON.stringify(op.active) + "\n";
                opStr += "new_options:" + JSON.stringify(op.new_options) + "\n";
                opStr += "extensions:" + JSON.stringify(op.extensions) + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 7) {

                let authorizingAccount;
                try {
                    authorizingAccount = await this._getAccountName(op.authorizing_account);
                } catch (error) {
                    console.log(error);
                }

                let accountToList;
                try {
                    accountToList = await this._getAccountName(op.account_to_list);
                } catch (error) {
                    console.log(error);
                }
                
                let opStr = "Account whitelist details: \n";
                opStr += "authorizing_account: " + authorizingAccount + "(" + op.authorizing_account + ")\n";
                opStr += "account_to_list: " + accountToList + "(" + op.account_to_list + ")\n";
                opStr += "new_listing: " + op.new_listing + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 8) {
                // account_upgrade
                let accountToUpgrade;
                try {
                    accountToUpgrade = await this._getAccountName(op.account_to_upgrade);
                } catch (error) {
                    console.log(error);
                }
                
                let opStr = "Upgrade account to lifetime member? \n";
                opStr += "account_to_upgrade: " + accountToUpgrade + "(" + op.account_to_upgrade + ")\n";
                opStr += "upgrade_to_lifetime_member: " + op.upgrade_to_lifetime_member + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 9) {
                // account_transfer
                let originalOwner;
                try {
                    originalOwner = await this._getAccountName(op.account_id);
                } catch (error) {
                    console.log(error);
                }

                let newOwner;
                try {
                    newOwner = await this._getAccountName(op.new_owner);
                } catch (error) {
                    console.log(error);
                }
                
                let opStr = "Transfer account to a new owner? \n";
                opStr += "Warning: This action is irreversible. \n";
                opStr += "account_id: " + originalOwner + "(" + op.account_id + ")\n";
                opStr += "new_owner: " + newOwner + "(" + op.new_owner + ")\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 10 || opType == 11) {
                // Create or Update an asset
                let asset;
                if (opType == 11) {
                    // fetch asset to update
                    try {
                      asset = await this._resolveAsset(op.asset_to_update);
                    } catch (error) {
                      console.log(error);
                      return;
                    }
                }
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
                let initialString = operation[0] == 10 ? "Issuing an asset \n" : "Updating an asset \n"
                let operationString =  initialString +
                                        `Symbol: ${symbol}\n` +
                                        `main: ${description.main}\n` +
                                        `market: ${description.market}\n` +
                                        `short_name: ${description.short_name}\n` +
                                        `Precision: ${precision}\n` +
                                        `max supply: ${max_supply}\n` +
                                        `market_fee_percent: ${market_fee_percent}\n` +
                                        `max_market_fee: ${max_market_fee}\n\n` +
                                        //
                                        `Core exchange rates:\n` +
                                        `Base amount: ${cer_base_amount}\n` +
                                        `Base asset id: ${cer_base_asset_id}\n` +
                                        `Quote amount: ${cer_quote_amount}\n` +
                                        `Quote asset id: ${cer_quote_asset_id}\n` +
                                        `whitelist_authorities: ${whitelist_authorities}\n` +
                                        `blacklist_authorities: ${blacklist_authorities}\n` +
                                        `whitelist_markets: ${whitelist_markets}\n` +
                                        `blacklist_markets: ${blacklist_markets}\n` +
                                        `is_prediction_market: ${is_prediction_market}\n\n` +
                                        //
                                        `Permissions:\n` + 
                                        `charge_market_fee: ${issuer_permissions["charge_market_fee"]}\n` +
                                        `white_list: ${issuer_permissions["white_list"]}\n` +
                                        `override_authority: ${issuer_permissions["override_authority"]}\n` +
                                        `transfer_restricted: ${issuer_permissions["transfer_restricted"]}\n` +
                                        `disable_confidential: ${issuer_permissions["disable_confidential"]}\n\n` +
                                        //
                                        `Flags:\n` +
                                        `charge_market_fee: ${flags["charge_market_fee"]}\n` +
                                        `white_list: ${flags["white_list"]}\n` +
                                        `override_authority: ${flags["override_authority"]}\n` +
                                        `transfer_restricted: ${flags["transfer_restricted"]}\n` +
                                        `disable_confidential: ${flags["disable_confidential"]}\n\n`;
                
                if (isBitasset) {
                    operationString += `Bitasset info: \n`;
                    operationString += `feed_lifetime_sec: ${op.bitasset_opts.feed_lifetime_sec}\n`;
                    operationString += `force_settlement_delay_sec: ${op.bitasset_opts.force_settlement_delay_sec}\n`;
                    operationString += `force_settlement_offset_percent: ${op.bitasset_opts.force_settlement_offset_percent}\n`;
                    operationString += `maximum_force_settlement_volume: ${op.bitasset_opts.maximum_force_settlement_volume}\n`;
                    operationString += `minimum_feeds: ${op.bitasset_opts.minimum_feeds}\n`;
                    operationString += `short_backing_asset: ${op.bitasset_opts.short_backing_asset}\n`;
                }
                if (nft_object) {
                    operationString += `NFT Contents: \n`;
                    operationString += `acknowledgements: ${nft_object.acknowledgements}\n`;
                    operationString += `artist: ${nft_object.artist}\n`;
                    operationString += `attestation: ${nft_object.attestation}\n`;
                    operationString += `holder_license: ${nft_object.holder_license}\n`;
                    operationString += `license: ${nft_object.license}\n`;
                    operationString += `narrative: ${nft_object.narrative}\n`;
                    operationString += `title: ${nft_object.title}\n`;
                    operationString += `tags: ${nft_object.tags}\n`;
                    operationString += `type: ${nft_object.type}\n`;
                }

                operations.push(operationString);
            } else if (opType == 12) {
                // asset_update_bitasset
                let shortBackingAsset;
                try {
                    shortBackingAsset = await this._resolveAsset(op.new_options.short_backing_asset);
                } catch (error) {
                    console.log(error);
                    return;
                }

                if (!shortBackingAsset) {
                    console.log("shortBackingAsset issue");
                    return;
                }

                let opStr = "Approve bitasset update? \n";
                opStr += "issuer: " + op.issuer + "\n";
                opStr += "asset_to_update: " + op.asset_to_update + "\n";
                opStr += "new_options:\n";
                opStr += "  feed_lifetime_sec: " + op.new_options.feed_lifetime_sec + "\n";
                opStr += "  minimum_feeds: " + op.new_options.minimum_feeds + "\n";
                opStr += "  force_settlement_delay_sec: " + op.new_options.force_settlement_delay_sec + "\n";
                opStr += "  force_settlement_offset_percent: " + op.new_options.force_settlement_offset_percent + "\n";
                opStr += "  maximum_force_settlement_volume: " + op.new_options.maximum_force_settlement_volume + "\n";
                opStr += "  short_backing_asset: " + shortBackingAsset.symbol + " (" + op.new_options.short_backing_asset + ")" + "\n";
                opStr += "  extensions: " + "\n";
                opStr += op.new_options.extensions ? JSON.stringify(op.new_options.extensions) : "No extensions";
                opStr += "\nEst. fee: " + formatAsset(op.fee.amount, "BTS", 5) + " (" + op.fee.asset_id + ")";
                operations.push(opStr);
            } else if (opType == 13) {
                // asset_update_feed_producers

                let issuer;
                try {
                    issuer = await this._getAccountName(op.issuer);
                } catch (error) {
                    console.log(error);
                }

                let assetToUpdate;
                try {
                    assetToUpdate = await this._resolveAsset(op.new_options.short_backing_asset);
                } catch (error) {
                    console.log(error);
                    return;
                }

                if (!assetToUpdate) {
                    console.log("assetToUpdate issue");
                    return;
                }

                let opStr = "Approve change to bitasset feed producers? \n";
                opStr += "issuer: " + issuer ?? '' + "(" + op.issuer + ")\n";
                opStr += "asset_to_update: " + assetToUpdate.symbol + "(" + op.asset_to_update + ")\n";
                opStr += "new_feed_producers: " + JSON.stringify(op.new_feed_producers) + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 14) {
                // asset_issue

                let issuer;
                try {
                    issuer = await this._getAccountName(op.issuer);
                } catch (error) {
                    console.log(error);
                }

                let targetAccount;
                try {
                    targetAccount = await this._getAccountName(op.issue_to_account);
                } catch (error) {
                    console.log(error);
                }

                let assetToIssue;
                try {
                    assetToIssue = await this._resolveAsset(op.asset_to_issue.asset_id);
                } catch (error) {
                    console.log(error);
                    return;
                }

                if (!assetToIssue) {
                    console.log("No asset to issue found");
                    return;
                }
                
                let opStr = `Issue ${op.asset_to_issue.amount} ${assetToIssue.symbol} (${assetToIssue.id}) to ${targetAccount} (${op.issue_to_account})? \n`;
                opStr += "Estimated fee: " + JSON.stringify(op.fee).amount + " (" + op.fee.asset_id + ")"
                operations.push(opStr);
            } else if (opType == 15) {
                // asset_reserve
                let payer;
                try {
                    payer = await this._getAccountName(op.payer);
                } catch (error) {
                    console.log(error);
                }

                let assetToReserve;
                try {
                    assetToReserve = await this._resolveAsset(op.amount_to_reserve.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!assetToReserve) {
                    console.log("assetToReserve issue");
                    return;
                }
                
                let opStr = "Approve the following asset reservation? \n";
                opStr += "payer: " + payer ?? '' + "(" + op.payer + ")\n";
                opStr += "amount_to_reserve: " + formatAsset(op.amount_to_reserve.amount, assetToReserve.symbol, assetToReserve.precision) + " (" + op.amount_to_reserve.asset_id + ")\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 16) {
                // asset_fund_fee_pool
                let fromAccount;
                try {
                    fromAccount = await this._getAccountName(op.from_account);
                } catch (error) {
                    console.log(error);
                }

                let assetToFund;
                try {
                    assetToFund = await this._resolveAsset(op.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!assetToFund) {
                    console.log("assetToFund issue");
                    return;
                }
                
                let opStr = "Fund the following asset's fee pool? \n";
                opStr += "from_account: " + fromAccount.symbol + "(" + op.from_account + ")\n";
                opStr += "asset: " + assetToFund.symbol + "(" + op.asset_id + ")\n";
                opStr += "amount: " + formatAsset(op.amount, assetToFund.symbol, assetToFund.precision) + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 17) {
                // asset_settle
                let account;
                try {
                    account = await this._getAccountName(op.account);
                } catch (error) {
                    console.log(error);
                }

                let assetToSettle;
                try {
                    assetToSettle = await this._resolveAsset(op.amount.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!assetToSettle) {
                    console.log("assetToSettle issue");
                    return;
                }
                
                let opStr = "Settle the following asset for its backing collateral? \n";
                opStr += "account: " + account ?? '' + "(" + op.account + ")\n";
                opStr += "amount: " + formatAsset(op.amount.amount, assetToSettle.symbol, assetToSettle.precision) + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 18) {
                // asset_global_settle
                let issuer;
                try {
                    issuer = await this._getAccountName(op.account);
                } catch (error) {
                    console.log(error);
                }

                let assetToSettle;
                try {
                    assetToSettle = await this._resolveAsset(op.asset_to_settle);
                } catch (error) {
                    console.log(error);
                }

                let baseAsset;
                try {
                    baseAsset = await this._resolveAsset(op.settle_price.base.asset_id);
                } catch (error) {
                    console.log(error);
                }

                let quoteAsset;
                try {
                    quoteAsset = await this._resolveAsset(op.settle_price.quote.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!assetToSettle || !baseAsset || !quoteAsset) {
                    console.log("asset_global_settle param issue");
                    return;
                }

                let price = humanReadableFloat(op.settle_price.base.amount, baseAsset.precision)
                    / humanReadableFloat(op.settle_price.quote.amount, quoteAsset.precision);
                
                let opStr = "Perform global settlement on the following asset? \n";
                opStr += "issuer: " + issuer + "(" + op.issuer + ")\n";
                opStr += "asset_to_settle: " + assetToSettle + "(" + op.asset_to_settle + ")\n";
                opStr += "settle_price: " + price + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 19) {
                // asset_publish_feed
                let publisher;
                try {
                    publisher = await this._getAccountName(op.publisher);
                } catch (error) {
                    console.log(error);
                }

                let baseAsset; // backing e.g. BTS
                try {
                    baseAsset = await this._resolveAsset(op.settle_price.base.asset_id);
                } catch (error) {
                    console.log(error);
                }

                let quoteAsset; // same as asset_id
                try {
                    quoteAsset = await this._resolveAsset(op.settle_price.quote.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!baseAsset || !quoteAsset) {
                    console.log("asset_publish_feed param issue");
                    return;
                }

                let coreExchangeRate = humanReadableFloat(op.feed.core_exchange_rate.base.amount, baseAsset.precision)
                / humanReadableFloat(op.feed.core_exchange_rate.quote.amount, quoteAsset.precision);

                let settlementPrice = humanReadableFloat(op.feed.settlement_price.base.amount, baseAsset.precision)
                / humanReadableFloat(op.feed.settlement_price.quote.amount, quoteAsset.precision);

                
                let opStr = "Publish a price feed for the following asset? \n";
                opStr += "publisher: " + publisher ?? '' + "(" + op.publisher + ")\n";
                opStr += "asset_id: " + quoteAsset.symbol + "(" + op.asset_id + ")\n";
                opStr += "feed: \n";
                opStr += "  core_exchange_rate: " + coreExchangeRate + "\n";
                opStr += "  settlement_price: " + settlementPrice + "\n";
                opStr += "  maintenance_collateral_ratio: " + op.feed.maintenance_collateral_ratio + "\n";
                opStr += "  maximum_short_squeeze_ratio: " + op.feed.maximum_short_squeeze_ratio + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 20) {
                // witness_create
                let witnessAccount;
                try {
                    witnessAccount = await this._getAccountName(op.witness_account);
                } catch (error) {
                    console.log(error);
                }
                
                let opStr = "Create a witness with the following details? \n";
                opStr += "witness_account: " + witnessAccount + "(" + op.witness_account + ")\n";
                opStr += "url: " + op.url + "\n";
                opStr += "block_signing_key: " + op.block_signing_key + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 21) {
                // witness_update
                let witnessAccount;
                try {
                    witnessAccount = await this._getAccountName(op.witness_account);
                } catch (error) {
                    console.log(error);
                }
                
                let opStr = "Update witness details to the following? \n";
                opStr += "witness: " + op.witness + "\n";
                opStr += "witness_account: " + witnessAccount + "(" + op.witness_account + ")\n";
                opStr += "new_url: " + op.new_url + "\n";
                opStr += "new_signing_key: " + op.new_signing_key ?? '' + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 22) {
                // proposal_create
                let feePayingAccount;
                try {
                    feePayingAccount = await this._getAccountName(op.fee_paying_account);
                } catch (error) {
                    console.log(error);
                }
                
                let opStr = "Create the following proposal? \n";
                opStr += "expiration_time: " + op.expiration_time + "\n";
                opStr += "proposed_ops: " + JSON.stringify(op.proposed_ops) + "\n";
                opStr += "review_period_seconds: " + op.review_period_seconds + "\n";
                opStr += "fee_paying_account: " + feePayingAccount + "(" + op.fee_paying_account + ")\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 23) {
                // proposal_update
                let feePayingAccount;
                try {
                    feePayingAccount = await this._getAccountName(op.fee_paying_account);
                } catch (error) {
                    console.log(error);
                }
                
                let opStr = "Update the following proposal? \n";
                opStr += "proposal: " + op.proposal + "\n";
                opStr += "active_approvals_to_add: " + JSON.stringify(op.active_approvals_to_add) + "\n";
                opStr += "active_approvals_to_remove: " + JSON.stringify(op.active_approvals_to_remove) + "\n";
                opStr += "owner_approvals_to_add: " + JSON.stringify(op.owner_approvals_to_add) + "\n";
                opStr += "owner_approvals_to_remove: " + JSON.stringify(op.owner_approvals_to_remove) + "\n";
                opStr += "key_approvals_to_add: " + JSON.stringify(op.key_approvals_to_add) + "\n";
                opStr += "key_approvals_to_remove: " + JSON.stringify(op.key_approvals_to_remove) + "\n";
                opStr += "fee_paying_account: " + feePayingAccount + "(" + op.fee_paying_account + ")\n";
                opStr += "extensions: " + JSON.stringify(op.extensions) + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 24) {
                // proposal_delete
                let feePayingAccount;
                try {
                    feePayingAccount = await this._getAccountName(op.fee_paying_account);
                } catch (error) {
                    console.log(error);
                }
                
                let opStr = "Delete the following proposal? \n";
                opStr += "using_owner_authority: " + op.using_owner_authority + "\n";
                opStr += "proposal: " + op.proposal + "\n";
                opStr += "fee_paying_account: " + feePayingAccount + "(" + op.fee_paying_account + ")\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : '' + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 25) {
                // withdraw_permission_create
                let to;
                try {
                  to = await this._getAccountName(op.authorized_account);
                } catch (error) {
                  console.log(error);
                }

                let from;
                try {
                    from = await this._getAccountName(op.withdraw_from_account);
                } catch (error) {
                    console.log(error);
                }

                let asset;
                try {
                  asset = await this._resolveAsset(op.withdrawal_limit.asset_id);
                } catch (error) {
                  console.log(error);
                  return;
                }

                if (!asset) {
                    console.log("withdraw_permission_create missing field");
                    return;
                }
                
                let opStr = "Direct Debit Authorization\n";
                opStr += " Recipient: " + to ?? '' + "(" + op.authorized_account + ")\n";
                opStr += " Account to withdraw from: " + from ?? '' + "(" + op.withdraw_from_account + ")\n";
                opStr += " Take " + formatAsset(op.withdrawal_limit.amount, asset.symbol, asset.precision) + " every " + period + " days, for " + op.periods_until_expiration + " periods";
                opStr += " Starting : " + op.period_start_time; // make more human readable?
                operations.push(opStr);
            } else if (opType == 26) {
                // withdraw_permission_update

                let withdrawFromAccount;
                try {
                    withdrawFromAccount = await this._getAccountName(op.withdraw_from_account);
                } catch (error) {
                    console.log(error);
                }

                let authorizedAccount;
                try {
                    authorizedAccount = await this._getAccountName(op.authorized_account);
                } catch (error) {
                    console.log(error);
                }

                let withdrawalLimit;
                try {
                    withdrawalLimit = await this._resolveAsset(op.withdrawal_limit.asset_id);
                } catch (error) {
                  console.log(error);
                }

                if (!withdrawalLimit) {
                    console.log("withdraw_permission_update missing field");
                    return;
                }
                
                let opStr = "Update witness permissions to the following? \n";
                opStr += "withdraw_from_account: " + withdrawFromAccount ?? '' + "(" + op.withdraw_from_account + ")\n";
                opStr += "authorized_account: " + authorizedAccount ?? '' + "(" + op.authorized_account + ")\n";
                opStr += "permission_to_update: " + op.permission_to_update + "\n";
                opStr += "withdrawal_limit: " + withdrawalLimit ? formatAsset(op.withdrawal_limit.amount, withdrawalLimit.symbol, withdrawalLimit.precision) : op.withdrawal_limit.amount + "(" + op.withdrawal_limit.asset_id + ")\n";
                opStr += "withdrawal_period_sec: " + op.withdrawal_period_sec + "\n";
                opStr += "period_start_time: " + op.period_start_time + "\n";
                opStr += "periods_until_expiration: " + op.periods_until_expiration + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 27) {
                // withdraw_permission_claim
                let from;
                try {
                    from = await this._getAccountName(op.withdraw_from_account);
                } catch (error) {
                    console.log(error);
                }

                let to;
                try {
                  to = await this._getAccountName(op.withdraw_to_account);
                } catch (error) {
                  console.log(error);
                }

                let withdrawnAsset;
                try {
                    withdrawnAsset = await this._resolveAsset(op.amount_to_withdraw.asset_id);
                } catch (error) {
                  console.log(error);
                }

                if (!withdrawnAsset) {
                    console.log("withdraw_permission_claim missing field");
                    return;
                }
                
                let opStr = "Claim the following withdrawal permission? \n";
                opStr += "withdraw_permission: " + op.withdraw_permission + "\n";
                opStr += "withdraw_from_account: " + from ?? '' + "(" + op.withdraw_from_account + ")\n";
                opStr += "withdraw_to_account: " + to ?? '' + "(" + op.withdraw_to_account + ")\n";
                opStr += "amount_to_withdraw: " + withdrawnAsset ? formatAsset(op.amount_to_withdraw.amount, withdrawnAsset.symbol, withdrawnAsset.precision) : op.amount_to_withdraw.amount + "(" + op.amount_to_withdraw.asset_id + ")\n";
                opStr += "memo: " + op.memo + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 28) {
                // withdraw_permission_delete
                let withdrawFromAccount;
                try {
                    withdrawFromAccount = await this._getAccountName(op.withdraw_from_account);
                } catch (error) {
                    console.log(error);
                }

                let authorizedAccount;
                try {
                    authorizedAccount = await this._getAccountName(op.withdraw_from_account);
                } catch (error) {
                    console.log(error);
                }
                
                let opStr = "Delete the following withdraw permission? \n";
                opStr += "withdraw_from_account: " + withdrawFromAccount + "(" + op.withdraw_from_account + ")\n";
                opStr += "authorized_account: " + authorizedAccount + "(" + op.authorized_account + ")\n";
                opStr += "withdrawal_permission: " + op.withdrawal_permission + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 29) {
                // committee_member_create
                let committeeMemberAccount;
                try {
                    committeeMemberAccount = await this._getAccountName(op.committee_member_account);
                } catch (error) {
                    console.log(error);
                }
                
                let opStr = "Create a committee member? \n";
                opStr += "committee_member_account: " + committeeMemberAccount + "(" + op.committee_member_account + ")\n";
                opStr += "url: " + op.url + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 30) {
                // committee_member_update
                let committeeMemberAccount;
                try {
                    committeeMemberAccount = await this._getAccountName(op.committee_member_account);
                } catch (error) {
                    console.log(error);
                }
                
                let opStr = "Update the following committee member's details? \n";
                opStr += "committee_member" + op.committee_member + "\n";
                opStr += "committee_member_account: " + committeeMemberAccount + "(" + op.committee_member_account + ")\n";
                opStr += "new_url: " + op.new_url + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 31) {
                // committee_member_update_global_parameters
                let opStr = "Approve of following global parameters as a committee? \n";
                opStr += "new_parameters: \n";
                opStr += "   current_fees" + JSON.stringify(op.new_parameters.current_fees) + "\n";
                opStr += "   block_interval: " + op.block_interval + "\n";
                opStr += "   maintenance_interval: " + op.maintenance_interval + "\n";
                opStr += "   maintenance_skip_slots: " + op.maintenance_skip_slots + "\n";
                opStr += "   committee_proposal_review_period: " + op.committee_proposal_review_period + "\n";
                opStr += "   maximum_transaction_size: " + op.maximum_transaction_size + "\n";
                opStr += "   maximum_block_size: " + op.maximum_block_size + "\n";
                opStr += "   maximum_time_until_expiration: " + op.maximum_time_until_expiration + "\n";
                opStr += "   maximum_proposal_lifetime: " + op.maximum_proposal_lifetime + "\n";
                opStr += "   maximum_asset_whitelist_authorities: " + op.maximum_asset_whitelist_authorities + "\n";
                opStr += "   maximum_asset_feed_publishers: " + op.maximum_asset_feed_publishers + "\n";
                opStr += "   maximum_witness_count: " + op.maximum_witness_count + "\n";
                opStr += "   maximum_committee_count: " + op.maximum_committee_count + "\n";
                opStr += "   maximum_authority_membership: " + op.maximum_authority_membership + "\n";
                opStr += "   reserve_percent_of_fee: " + op.reserve_percent_of_fee + "\n";
                opStr += "   network_percent_of_fee: " + op.network_percent_of_fee + "\n";
                opStr += "   lifetime_referrer_percent_of_fee: " + op.lifetime_referrer_percent_of_fee + "\n";
                opStr += "   cashback_vesting_period_seconds: " + op.cashback_vesting_period_seconds + "\n";
                opStr += "   cashback_vesting_threshold: " + op.cashback_vesting_threshold + "\n";
                opStr += "   count_non_member_votes: " + op.count_non_member_votes + "\n";
                opStr += "   allow_non_member_whitelists: " + op.allow_non_member_whitelists + "\n";
                opStr += "   witness_pay_per_block: " + op.witness_pay_per_block + "\n";
                opStr += "   worker_budget_per_day: " + op.worker_budget_per_day + "\n";
                opStr += "   max_predicate_opcode: " + op.max_predicate_opcode + "\n";
                opStr += "   fee_liquidation_threshold: " + op.fee_liquidation_threshold + "\n";
                opStr += "   accounts_per_fee_scale: " + op.accounts_per_fee_scale + "\n";
                opStr += "   account_fee_scale_bitshifts: " + op.account_fee_scale_bitshifts + "\n";
                opStr += "   max_authority_depth: " + op.max_authority_depth + "\n";
                opStr += "Extensions: " + JSON.stringify(op.extensions) + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 32) {
                // vesting_balance_create
                let creator;
                try {
                  creator = await this._getAccountName(op.creator);
                } catch (error) {
                  console.log(error);
                }

                let owner;
                try {
                  owner = await this._getAccountName(op.owner);
                } catch (error) {
                  console.log(error);
                }

                let amount;
                try {
                    amount = await this._resolveAsset(op.amount.asset_id);
                } catch (error) {
                  console.log(error);
                }

                if (!amount) {
                    console.log("vesting_balance_create: amount is null");
                    return;
                }

                let policy = op.policy;
                let policyRows = "";
                if (policy[0] == 0) {
                    policyRows = "  begin_timestamp: " + policy[1].begin_timestamp + "\n"
                                 "  vesting_cliff_seconds: " + policy[1].vesting_cliff_seconds + "\n"
                                 "  vesting_duration_seconds: " + policy[1].vesting_duration_seconds + "\n"
                } else {
                    policyRows = "  start_claim: " + policy[1].start_claim + "\n" +
                                 "  vesting_seconds: " + policy[1].vesting_seconds
                }
                
                let opStr = "Create the following vesting balance? \n";
                opStr += "creator: " + creator + "(" + op.creator + ")\n";
                opStr += "owner: "  + owner + "(" + op.owner + ")\n";
                opStr += "amount: " + formatAsset(op.amount.amount, amount.symbol, amount.precision) + "(" + op.amount.asset_id + ")\n";
                opStr += "policy: \n";
                opStr += "  type: " + op.policy[0] > 0 ? "" : "" + "\n";
                opStr += policyRows;
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 33) {
                // vesting_balance_withdraw
                let owner;
                try {
                  owner = await this._getAccountName(op.owner);
                } catch (error) {
                  console.log(error);
                  return;
                }

                let asset;
                try {
                  asset = await this._resolveAsset(op.amount.asset_id);
                } catch (error) {
                  console.log(error);
                  return;
                }

                if (!asset) {
                    console.log("vesting_balance_withdraw: asset is null");
                    return;
                }
                
                let opStr = "Vesting Balance\n";
                opStr += " owner: " + owner + "(" + op.owner + ")\n";
                opStr += " Claim " + formatAsset(op.amount.amount, asset.symbol, asset.precision) + "(" + op.amount.asset_id + ") from vesting balance " + op.vesting_balance;
                operations.push(opStr);
            } else if (opType == 34) {
                // worker_create
                let owner;
                try {
                  owner = await this._getAccountName(op.owner);
                } catch (error) {
                  console.log(error);
                  return;
                }
                
                let opStr = "Create the following worker proposal? \n";
                opStr += " owner: " + owner + "(" + op.owner + ")\n";
                opStr += "work_begin_date: " + op.work_begin_date + "\n";
                opStr += "work_end_date: " + op.work_end_date + "\n";
                opStr += "daily_pay: " + op.daily_pay + "\n";
                opStr += "name: " + op.name + "\n";
                opStr += "url: " + op.url + "\n";
                opStr += "initializer: " + JSON.stringify(op.initializer) + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 35) {
                // custom
                let payer;
                try {
                  payer = await this._getAccountName(op.payer);
                } catch (error) {
                  console.log(error);
                }
                
                let opStr = "Custom operation: \n";
                opStr += "payer: " + payer ?? '' + "(" + op.payer + ")\n";
                opStr += "required_auths: " + op.required_auths + "\n";
                opStr += "id: " + op.id + "\n";
                opStr += "data: " + op.data + "\n"; // TODO: Convert bytes to safe format?
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 36) {
                // assert
                let feePayingAccount;
                try {
                    feePayingAccount = await this._getAccountName(op.fee_paying_account);
                } catch (error) {
                  console.log(error);
                }
                
                let opStr = "Assert operation: \n";
                opStr += "fee_paying_account: " + feePayingAccount ?? '' + "(" + op.fee_paying_account + ")\n";
                opStr += "predicates: " + JSON.stringify(op.predicates) + "\n";
                opStr += "required_auths: " + JSON.stringify(op.required_auths) + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 37) {
                // balance_claim
                let depositToAccount;
                try {
                    depositToAccount = await this._getAccountName(op.deposit_to_account);
                } catch (error) {
                  console.log(error);
                }

                let claimedAsset;
                try {
                    claimedAsset = await this._resolveAsset(op.amount.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!claimedAsset) {
                    console.log("balance_claim: claimedAsset is null");
                    return;
                }
                
                let opStr = "Claim the following balance? \n";
                opStr += "deposit_to_account: " + depositToAccount + "(" + op.deposit_to_account + ")\n";
                opStr += "balance_to_claim: " + op.balance_to_claim + "\n";
                opStr += "balance_owner_key: " + op.balance_owner_key + "\n";
                opStr += "total_claimed: " + formatAsset(op.amount.amount, claimedAsset.symbol, claimedAsset.precision) + "(" + op.amount.asset_id + ")\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 38) {
                // override_transfer
                let issuer;
                try {
                  issuer = await this._getAccountName(op.issuer);
                } catch (error) {
                  console.log(error);
                }

                let from;
                try {
                    from = await this._getAccountName(op.from);
                } catch (error) {
                  console.log(error);
                }

                let to;
                try {
                    to = await this._getAccountName(op.to);
                } catch (error) {
                  console.log(error);
                }

                let overridenAsset;
                try {
                    overridenAsset = await this._resolveAsset(op.amount.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!overridenAsset) {
                    console.log("override_transfer: overridenAsset is null");
                    return;
                }
                
                let opStr = "Override the following transfer? \n";
                opStr += "issuer: " + issuer + "(" + op.issuer + ")\n";
                opStr += "from: " + from + "(" +  op.from + ")\n";
                opStr += "to: " + to + "(" +  op.to + ")\n";
                opStr += "amount: " + formatAsset(op.amount.amount, overridenAsset.symbol, overridenAsset.precision) + "(" + op.amount.asset_id + ")\n";
                opStr += "memo: " + op.memo + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 39) {
                // transfer_to_blind
                let from;
                try {
                    from = await this._getAccountName(op.from);
                } catch (error) {
                  console.log(error);
                }

                let assetToTransfer;
                try {
                    assetToTransfer = await this._resolveAsset(op.amount.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!assetToTransfer) {
                    console.log("transfer_to_blind: assetToTransfer is null");
                    return;
                }
                
                let opStr = "Transfer the following to blind? \n";
                opStr += "amount: " + formatAsset(op.amount.amount, assetToTransfer.symbol, assetToTransfer.precision) + "\n";
                opStr += "from: " + from + "(" +  op.from + ")\n";
                opStr += "blinding_factor: " + op.blinding_factor + "\n";
                opStr += "outputs: " + JSON.stringify(op.outputs) + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 40) {
                // blind_transfer         
                let opStr = "Approve the following blind transfer? \n";
                opStr += "inputs: " + JSON.stringify(op.inputs) + "\n";
                opStr += "outputs: " + JSON.stringify(op.outputs) + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 41) {
                // transfer_from_blind
                let to;
                try {
                    to = await this._getAccountName(op.to);
                } catch (error) {
                  console.log(error);
                }

                let assetToTransfer;
                try {
                    assetToTransfer = await this._resolveAsset(op.amount.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!assetToTransfer) {
                    console.log("transfer_from_blind: assetToTransfer is null");
                    return;
                }
                
                let opStr = "Transfer from blind? \n";
                opStr += "amount: " + formatAsset(op.amount.amount, assetToTransfer.symbol, assetToTransfer.precision) + "\n";
                opStr += "to: " + to + "(" +  op.to + ")\n";
                opStr += "blinding_factor: " + op.blinding_factor + "\n";
                opStr += "inputs: " + JSON.stringify(op.inputs) + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 43) {
                // asset_claim_fees
                let issuer;
                try {
                    issuer = await this._getAccountName(op.issuer);
                } catch (error) {
                  console.log(error);
                }

                let assetToClaim;
                try {
                    assetToClaim = await this._resolveAsset(op.amount_to_claim.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!assetToClaim) {
                    console.log("asset_claim_fees: assetToClaim is null");
                    return;
                }
                
                let opStr = "Withdraw the fees from the following asset? \n";
                opStr += "issuer: " + issuer + "(" +  op.issuer + ")\n";
                opStr += "amount_to_claim: " + formatAsset(op.amount_to_claim.amount, assetToClaim.symbol, assetToClaim.precision) + "\n";
                opStr += "extensions: " + JSON.stringify(op.extensions) + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 45) {
                // bid_collateral
                let bidder;
                try {
                    bidder = await this._getAccountName(op.bidder);
                } catch (error) {
                  console.log(error);
                }

                let collateral;
                try {
                    collateral = await this._resolveAsset(op.additional_collateral.asset_id);
                } catch (error) {
                    console.log(error);
                }

                let debtCovered;
                try {
                    debtCovered = await this._resolveAsset(op.debtCovered.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!collateral || !debtCovered) {
                    console.log("bid_collateral: collateral or debtCovered is null");
                    return;
                } 
                
                let opStr = "Approve the following collateral bid? \n";
                opStr += "bidder: " + bidder + "(" +  op.bidder + ")\n";
                opStr += "additional_collateral: " + formatAsset(op.additional_collateral.amount, collateral.symbol, collateral.precision) + "\n";
                opStr += "debt_covered: " + formatAsset(op.debt_covered.amount, debtCovered.symbol, debtCovered.precision) + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 47) {
                // asset_claim_pool
                let issuer;
                try {
                    issuer = await this._getAccountName(op.issuer);
                } catch (error) {
                  console.log(error);
                }

                let relevantAsset;
                try {
                    relevantAsset = await this._resolveAsset(op.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!relevantAsset) {
                    console.log("asset_claim_pool: relevantAsset is null");
                    return;
                }
                
                let opStr = "Claim assets from pool? \n";
                opStr += "issuer: " + issuer + "(" +  op.issuer + ")\n";
                opStr += "asset_id: " + op.asset_id + "\n";
                opStr += "amount_to_claim: " + formatAsset(op.amount_to_claim.amount, relevantAsset.symbol, relevantAsset.precision) + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 48) {
                // asset_update_issuer
                let issuer;
                try {
                    issuer = await this._getAccountName(op.issuer);
                } catch (error) {
                  console.log(error);
                }

                let new_issuer;
                try {
                    new_issuer = await this._getAccountName(op.new_issuer);
                } catch (error) {
                  console.log(error);
                }

                let assetToUpdate;
                try {
                    assetToUpdate = await this._resolveAsset(op.asset_to_update);
                } catch (error) {
                    console.log(error);
                }

                if (!assetToUpdate) {
                    console.log("asset_update_issuer: assetToUpdate is null");
                    return;
                }
                
                let opStr = "Update asset issuer? \n";
                opStr += "issuer: " + issuer + "(" +  op.issuer + ")\n";
                opStr += "asset_to_update: " + assetToUpdate + "(" +  op.asset_to_update + ")\n";
                opStr += "new_issuer: " + new_issuer + "(" +  op.new_issuer + ")\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 49) {
                // htlc_create
                let from;
                try {
                    from = await this._getAccountName(op.from);
                } catch (error) {
                  console.log(error);
                }

                let to;
                try {
                    to = await this._getAccountName(op.to);
                } catch (error) {
                  console.log(error);
                }

                let htlcAsset;
                try {
                    htlcAsset = await this._resolveAsset(op.amount.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!htlcAsset) {
                    console.log("htlc_create: htlcAsset is null");
                    return;
                }
                
                let opStr = "Create the following HTLC operaton? \n";
                opStr += "from: " + from + "(" +  op.from + ")\n";
                opStr += "to: " + to + "(" +  op.to + ")\n";
                opStr += "amount: " + formatAsset(op.amount.amount, htlcAsset.symbol, htlcAsset.precision) + "\n";
                opStr += "preimage_hash: " + op.preimage_hash + "\n";
                opStr += "preimage_size: " + op.preimage_size + "\n";
                opStr += "claim_period_seconds: " + op.claim_period_seconds + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 50) {
                // htlc_redeem
                let redeemer;
                try {
                    redeemer = await this._getAccountName(op.redeemer);
                } catch (error) {
                  console.log(error);
                }
                
                let opStr = "Redeem the following HTLC operation? \n";
                opStr += "htlc_id: " + op.htlc_id + "\n";
                opStr += "redeemer: " + redeemer + "(" +  op.redeemer + ")\n";
                opStr += "preimage: " + op.preimage + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 52) {
                // htlc_extend
                let update_issuer;
                try {
                    update_issuer = await this._getAccountName(op.update_issuer);
                } catch (error) {
                  console.log(error);
                }
                
                let opStr = "Approve the following HTLC extension? \n";
                opStr += "htlc_id: " + op.htlc_id + "\n";
                opStr += "update_issuer: " + op.update_issuer + "\n";
                opStr += "update_issuer: " + update_issuer + "(" +  op.update_issuer + ")\n";
                opStr += "seconds_to_add: " + op.seconds_to_add + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 54) {
                // custom_authority_create
                let account;
                try {
                    account = await this._getAccountName(op.account);
                } catch (error) {
                  console.log(error);
                }
                
                let opStr = "Create the following custom authority? \n";
                opStr += "account: " + account + "(" +  op.account + ")\n";
                opStr += "enabled: " + op.enabled + "\n";
                opStr += "valid_from: " + op.valid_from + "\n";
                opStr += "valid_to: " + op.valid_to + "\n";
                opStr += "operation_type: " + op.operation_type + "\n";
                opStr += "auth: " + JSON.stringify(op.auth) + "\n";
                opStr += "restrictions: " + JSON.stringify(op.restrictions) + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 55) {
                // custom_authority_update
                let account;
                try {
                    account = await this._getAccountName(op.account);
                } catch (error) {
                  console.log(error);
                }
                
                let opStr = "Update the following custom authority? \n";
                opStr += "account: " + account + "(" +  op.account + ")\n";
                opStr += "authority_to_update: " + op.authority_to_update + "\n";
                opStr += "new_enabled: " + op.new_enabled + "\n";
                opStr += "new_valid_from: " + op.new_valid_from + "\n";
                opStr += "new_valid_to: " + op.new_valid_to + "\n";
                opStr += "new_auth: " + JSON.stringify(op.new_auth) + "\n";
                opStr += "restrictions_to_remove: " + JSON.stringify(op.restrictions_to_remove) + "\n";
                opStr += "restrictions_to_add: " + JSON.stringify(op.restrictions_to_add) + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 56) {
                // custom_authority_delete
                let account;
                try {
                    account = await this._getAccountName(op.account);
                } catch (error) {
                  console.log(error);
                }
                
                let opStr = "Delete the following custom authority? \n";
                opStr += "account: " + account + "(" +  op.account + ")\n";
                opStr += "authority_to_delete: " + op.authority_to_delete + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 57) {
                // ticket_create
                let account;
                try {
                    account = await this._getAccountName(op.account);
                } catch (error) {
                  console.log(error);
                }

                let ticketAsset;
                try {
                    ticketAsset = await this._resolveAsset(op.amount.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!ticketAsset) {
                    console.log("ticket_create: ticketAsset is null");
                    return;
                }
                
                let opStr = "Create the following ticket? \n";
                opStr += "account: " + account + "(" +  op.account + ")\n";
                opStr += "target_type: " + op.target_type + "\n";
                opStr += "amount: " + formatAsset(op.amount.amount, ticketAsset.symbol, ticketAsset.precision) + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 58) {
                // ticket_update
                let account;
                try {
                    account = await this._getAccountName(op.account);
                } catch (error) {
                  console.log(error);
                }

                let ticketAsset;
                try {
                    ticketAsset = await this._resolveAsset(op.amount_for_new_target.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!ticketAsset) {
                    console.log("ticket_update: ticketAsset is null");
                    return;
                }
                
                let opStr = "Update the following ticket? \n";
                opStr += "ticket: " + op.ticket + "\n";
                opStr += "account: " + account + "(" +  op.account + ")\n";
                opStr += "target_type: " + op.target_type + "\n";
                opStr += "amount_for_new_target: " + formatAsset(op.amount_for_new_target.amount, ticketAsset.symbol, ticketAsset.precision) + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                operations.push(opStr);
            } else if (opType == 59) {
                // liquidity_pool_create
                let account;
                try {
                    account = await this._getAccountName(op.account);
                } catch (error) {
                  console.log(error);
                }

                let assetA;
                try {
                    assetA = await this._resolveAsset(op.asset_a);
                } catch (error) {
                    console.log(error);
                }

                let assetB;
                try {
                    assetB = await this._resolveAsset(op.asset_b);
                } catch (error) {
                    console.log(error);
                }

                let shareAsset;
                try {
                    shareAsset = await this._resolveAsset(op.share_asset);
                } catch (error) {
                    console.log(error);
                }

                if (!assetA || !assetB || !shareAsset) {
                    console.log("liquidity_pool_create: assetA, assetB or shareAsset is null");
                    return;
                }
                
                let opStr = "Create a liquidity pool with the following details? \n";
                opStr += "account: " + account + "(" +  op.account + ")\n";
                opStr += "asset_a: " + assetA.symbol + "(" + op.asset_a + ")\n";
                opStr += "asset_b: " + assetB.symbol + "(" + op.asset_b + ")\n";
                opStr += "share_asset: " + shareAsset.symbol + "(" + op.share_asset + ")\n";
                opStr += "taker_fee_percent: " + op.taker_fee_percent + "\n";
                opStr += "withdrawal_fee_percent: " + op.withdrawal_fee_percent + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 60) {
                // liquidity_pool_delete
                let account;
                try {
                    account = await this._getAccountName(op.account);
                } catch (error) {
                  console.log(error);
                }
                
                let opStr = "Delete the following liquidity pool? \n";
                opStr += "account: " + account ?? '' + "(" +  op.account + ")\n";
                opStr += "pool: " + op.pool + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 61) {
                // liquidity_pool_deposit
                let account;
                try {
                    account = await this._getAccountName(op.account);
                } catch (error) {
                  console.log(error);
                }

                let amountA;
                try {
                    amountA = await this._resolveAsset(op.amount_a.asset_id);
                } catch (error) {
                    console.log(error);
                }

                let amountB;
                try {
                    amountB = await this._resolveAsset(op.amount_b.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!amountA || !amountB) {
                    console.log("liquidity_pool_deposit: amountA or amountB is null");
                    return;
                }
                
                let opStr = "Deposit into the following liquidity pool? \n";
                opStr += "account: " + account ?? '' + "(" +  op.account + ")\n";
                opStr += "pool: " + op.pool + "\n";
                opStr += "amount_a: " + formatAsset(op.amount_a.amount, amountA.symbol, amountA.precision) + "\n";
                opStr += "amount_b: " + formatAsset(op.amount_b.amount, amountB.symbol, amountB.precision) + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 62) {
                // liquidity_pool_withdraw
                let account;
                try {
                    account = await this._getAccountName(op.account);
                } catch (error) {
                  console.log(error);
                }

                let shareAsset;
                try {
                    shareAsset = await this._resolveAsset(op.share_amount.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!shareAsset) {
                    console.log("liquidity_pool_withdraw: shareAsset is null");
                    return;
                }
                
                let opStr = "Withdraw from the following liquidity pool? \n";
                opStr += "account: " + account ?? '' + "(" +  op.account + ")\n";
                opStr += "pool: " + op.pool + "\n";
                opStr += "share_amount: " + formatAsset(op.share_amount.amount, shareAsset.symbol, shareAsset.precision) + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 63) {
                // liquidity_pool_exchange
                let account;
                try {
                    account = await this._getAccountName(op.account);
                } catch (error) {
                  console.log(error);
                }

                let soldAsset;
                try {
                    soldAsset = await this._resolveAsset(op.amount_to_sell.asset_id);
                } catch (error) {
                    console.log(error);
                }

                let receivedAsset;
                try {
                    receivedAsset = await this._resolveAsset(op.min_to_receive.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!soldAsset || !receivedAsset) {
                    console.log("liquidity_pool_exchange: soldAsset or receivedAsset is null");
                    return;
                }
                
                let opStr = "Approve of the following liquidity pool exchange? \n";
                opStr += "account: " + account ?? '' + "(" +  op.account + ")\n";
                opStr += "pool: " + op.pool + "\n";
                opStr += "amount_to_sell: " + formatAsset(op.amount_to_sell.amount, soldAsset.symbol, soldAsset.precision) + "\n";
                opStr += "min_to_receive: " + formatAsset(op.min_to_receive.amount, receivedAsset.symbol, receivedAsset.precision) + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 64) {
                // samet_fund_create
                let ownerAccount;
                try {
                    ownerAccount = await this._getAccountName(op.owner_account);
                } catch (error) {
                  console.log(error);
                }
                
                let opStr = "Approve of the following samet fund creation? \n";
                opStr += "owner_account: " + ownerAccount ?? '' + "(" +  op.owner_account + ")\n";
                opStr += "asset_type: " + op.asset_type + "\n";
                opStr += "balance: " + op.balance + "\n";
                opStr += "fee_rate: " + op.fee_rate + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 65) {
                // samet_fund_delete
                let ownerAccount;
                try {
                    ownerAccount = await this._getAccountName(op.owner_account);
                } catch (error) {
                  console.log(error);
                }
                
                let opStr = "Deleting the following samet fund \n";
                opStr += "owner_account: " + ownerAccount ?? '' + "(" +  op.owner_account + ")\n";
                opStr += "fund_id: " + op.fund_id + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 66) {
                // samet_fund_update
                let ownerAccount;
                try {
                    ownerAccount = await this._getAccountName(op.owner_account);
                } catch (error) {
                  console.log(error);
                }

                let deltaAmount;
                if (op.delta_amount) {
                    try {
                      deltaAmount = await this._getAccountName(op.delta_amount.asset_id);
                    } catch (error) {
                      console.log(error);
                    }
                }
                
                let opStr = "Update the following samet fund? \n"
                opStr += "owner_account: " + ownerAccount ?? '' + "(" +  op.owner_account + ")\n"
                opStr += "fund_id: " + op.fund_id + "\n"
                opStr += "delta_amount: " + deltaAmount ? formatAsset(op.delta_amount.amount, deltaAmount.symbol, deltaAmount.precision) : '{}' + "\n"
                opStr += "new_fee_rate: " + op.new_fee_rate ?? '' + "\n"
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n"
                opStr += "Estimated fee: " + JSON.stringify(op.fee)
                operations.push(opStr);
            } else if (opType == 67) {
                // samet_fund_borrow
                let borrower;
                try {
                  borrower = await this._getAccountName(op.borrower);
                } catch (error) {
                  console.log(error);
                }

                let borrowAmount;
                try {
                    borrowAmount = await this._resolveAsset(op.borrow_amount.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!borrowAmount) {
                    console.log("samet_fund_borrow: borrowAmount is null");
                    return;
                }
                
                let opStr = "Borrow from the following samet fund? \n"
                opStr += "borrower: " + borrower ?? '' + "(" + op.borrower + ")\n"
                opStr += "fund_id: " + op.fund_id + "\n"
                opStr += "borrow_amount: " + formatAsset(op.borrow_amount.amount, borrowAmount.symbol, borrowAmount.precision) + "\n"
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n"
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 68) {
                // samet_fund_repay
                let account;
                try {
                    account = await this._getAccountName(op.account);
                } catch (error) {
                  console.log(error);
                }

                let repayAmount;
                try {
                    repayAmount = await this._resolveAsset(op.repay_amount.asset_id);
                } catch (error) {
                    console.log(error);
                }

                let fundFee;
                try {
                    fundFee = await this._resolveAsset(op.fund_fee.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!repayAmount || !fundFee) {
                    console.log("samet_fund_repay: repayAmount or fundFee is null");
                    return;
                }
                
                let opStr = "Repay the following samet fund? \n";
                opStr += "account: " + account ?? '' + "(" + op.account + ")\n";
                opStr += "fund_id: " + op.fund_id + "\n";
                opStr += "repay_amount: " + formatAsset(op.repay_amount.amount, repayAmount.symbol, repayAmount.precision) + "\n";
                opStr += "fund_fee: " + formatAsset(op.fund_fee.amount, fundFee.symbol, fundFee.precision) + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 69) {
                // credit_offer_create
                let ownerAccount;
                try {
                    ownerAccount = await this._getAccountName(op.owner_account);
                } catch (error) {
                  console.log(error);
                }
                
                let opStr = "Approve the creation of the following credit offer? \n";
                opStr += "owner_account: " + ownerAccount + "(" + op.owner_account + ")\n";
                opStr += "asset_type: " + op.asset_type + "\n";
                opStr += "balance: " + op.balance + "\n";
                opStr += "fee_rate: " + op.fee_rate + "\n";
                opStr += "max_duration_seconds: " + op.max_duration_seconds + "\n";
                opStr += "min_deal_amount: " + op.min_deal_amount + "\n";
                opStr += "enabled: " + op.enabled + "\n";
                opStr += "auto_disable_time: " + op.auto_disable_time + "\n";
                opStr += "acceptable_collateral: " + JSON.stringify(op.acceptable_collateral) + "\n";
                opStr += "acceptable_borrowers: " + JSON.stringify(op.acceptable_borrowers) + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 70) {
                // credit_offer_delete
                let ownerAccount;
                try {
                    ownerAccount = await this._getAccountName(op.owner_account);
                } catch (error) {
                  console.log(error);
                }
                
                let opStr = "Delete the following credit offer? \n";
                opStr += "owner_account: " + ownerAccount + "(" + op.owner_account + ")\n";
                opStr += "offer_id: " + op.offer_id + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 71) {
                // credit_offer_update
                let ownerAccount;
                try {
                    ownerAccount = await this._getAccountName(op.owner_account);
                } catch (error) {
                  console.log(error);
                }

                let deltaAmount;
                if (op.delta_amount) {
                    try {
                        deltaAmount = await this._resolveAsset(op.delta_amount.asset_id);
                    } catch (error) {
                        console.log(error);
                    }
                }

                if (!deltaAmount) {
                    console.log("credit_offer_update: deltaAmount is null");
                    return;
                }
                
                let opStr = "Update the following credit offer? \n";
                opStr += "owner_account: " + ownerAccount + "(" + op.owner_account + ")\n";
                opStr += "offer_id: " + op.offer_id + "\n";
                opStr += "delta_amount: " + formatAsset(op.delta_amount.amount, deltaAmount.symbol, deltaAmount.precision) + "\n";
                opStr += "fee_rate: " + op.fee_rate + "\n";
                opStr += "max_duration_seconds: " + op.max_duration_seconds + "\n";
                opStr += "min_deal_amount: " + op.min_deal_amount + "\n";
                opStr += "enabled: " + op.enabled + "\n";
                opStr += "auto_disable_time: " + op.auto_disable_time + "\n";
                opStr += "acceptable_collateral: " + JSON.stringify(op.acceptable_collateral) + "\n";
                opStr += "acceptable_borrowers: " + JSON.stringify(op.acceptable_borrowers) + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 72) {
                // credit_offer_accept
                let borrower;
                try {
                    borrower = await this._getAccountName(op.borrower);
                } catch (error) {
                  console.log(error);
                }

                let borrowAmount;
                try {
                    borrowAmount = await this._resolveAsset(op.borrow_amount.asset_id);
                } catch (error) {
                    console.log(error);
                }

                let collateral;
                try {
                    collateral = await this._resolveAsset(op.collateral.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!borrowAmount || !collateral) {
                    console.log("credit_offer_accept: borrowAmount or collateral is null");
                    return;
                }
                
                let opStr = "Approve of the following credit offer? \n";
                opStr += "borrower: " + borrower + "(" + op.borrower + ")\n";
                opStr += "offer_id: " + op.offer_id + "\n";
                opStr += "borrow_amount: " + formatAsset(op.borrow_amount.amount, borrowAmount.symbol, borrowAmount.precision) + "\n";
                opStr += "collateral: " + formatAsset(op.collateral.amount, collateral.symbol, collateral.precision) + "\n";
                opStr += "max_fee_rate: " + op.max_fee_rate + "\n";
                opStr += "min_duration_seconds: " + op.min_duration_seconds + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            } else if (opType == 73) {
                // credit_deal_repay
                let account;
                try {
                    account = await this._getAccountName(op.account);
                } catch (error) {
                  console.log(error);
                }

                let repayAmount;
                try {
                    repayAmount = await this._resolveAsset(op.repay_amount.asset_id);
                } catch (error) {
                    console.log(error);
                }

                let creditFee;
                try {
                    creditFee = await this._resolveAsset(op.credit_fee.asset_id);
                } catch (error) {
                    console.log(error);
                }

                if (!repayAmount || !creditFee) {
                    console.log("credit_deal_repay: repayAmount or creditFee is null");
                    return;
                }
                
                let opStr = "Repay the following credit deal? \n";
                opStr += "account: " + account + "(" + op.account + ")\n";
                opStr += "deal_id: " + op.deal_id + "\n";
                opStr += "repay_amount: " + formatAsset(op.repay_amount.amount, repayAmount.symbol, repayAmount.precision) + "\n";
                opStr += "credit_fee: " + formatAsset(op.credit_fee.amount, creditFee.symbol, creditFee.precision) + "\n";
                opStr += "extensions: " + op.extensions ? JSON.stringify(op.extensions) : "[]" + "\n";
                opStr += "Estimated fee: " + JSON.stringify(op.fee);
                operations.push(opStr);
            }
        }

        if (!operations.length) {
            return false;
        }

        let header = operations.length == 1 ? "" : "Transaction\n";

        return `${header}${operations.join('\n')}`;
    }

}