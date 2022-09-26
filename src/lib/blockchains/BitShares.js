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
                "id": Actions.GET_ACCOUNT,
                "method": Actions.GET_ACCOUNT
            },
            {
                "id": Actions.REQUEST_SIGNATURE,
                "method": Actions.REQUEST_SIGNATURE
            },
            {
                "id": Actions.INJECTED_CALL,
                "method": Actions.INJECTED_CALL
            },
            {
                "id": Actions.VOTE_FOR,
                "method": Actions.VOTE_FOR
            },
            {
                "id": Actions.SIGN_MESSAGE,
                "method": Actions.SIGN_MESSAGE
            },
            {
                "id": Actions.SIGN_NFT,
                "method": Actions.SIGN_NFT
            },
            {
                "id": Actions.VERIFY_MESSAGE,
                "method": Actions.VERIFY_MESSAGE
            },
            {
                "id": Actions.TRANSFER,
                "method": Actions.TRANSFER
            },
            // Blockchain based:
            {
                id: 0,
                method: "transfer"
            },
            {
                id: 1,
                method: "limit_order_create"
            },
            {
                id: 2,
                method: "limit_order_cancel"
            },
            {
                id: 3,
                method: "call_order_update"
            },
            {
                id: 5,
                method: "account_create"
            },
            {
                id: 6,
                method: "account_update"
            },
            {
                id: 7,
                method: "account_whitelist"
            },
            {
                id: 8,
                method: "account_upgrade"
            },
            {
                id: 9,
                method: "account_transfer"
            },
            {
                id: 10,
                method: "asset_create"
            },
            {
                id: 11,
                method: "asset_update"
            },
            {
                id: 12,
                method: "asset_update_bitasset"
            },
            {
                id: 13,
                method: "asset_update_feed_producers"
            },
            {
                id: 14,
                method: "asset_issue"
            },
            {
                id: 15,
                method: "asset_reserve"
            },
            {
                id: 16,
                method: "asset_fund_fee_pool"
            },
            {
                id: 17,
                method: "asset_settle"
            },
            {
                id: 18,
                method: "asset_global_settle"
            },
            {
                id: 19,
                method: "asset_publish_feed"
            },
            {
                id: 20,
                method: "witness_create"
            },
            {
                id: 21,
                method: "witness_update"
            },
            {
                id: 22,
                method: "proposal_create"
            },
            {
                id: 23,
                method: "proposal_update"
            },
            {
                id: 24,
                method: "proposal_delete"
            },
            {
                id: 25,
                method: "withdraw_permission_create"
            },
            {
                id: 26,
                method: "withdraw_permission_update"
            },
            {
                id: 27,
                method: "withdraw_permission_claim"
            },
            {
                id: 28,
                method: "withdraw_permission_delete"
            },
            {
                id: 29,
                method: "committee_member_create"
            },
            {
                id: 30,
                method: "committee_member_update"
            },
            {
                id: 31,
                method: "committee_member_update_global_parameters"
            },
            {
                id: 32,
                method: "vesting_balance_create"
            },
            {
                id: 33,
                method: "vesting_balance_withdraw"
            },
            {
                id: 34,
                method: "worker_create"
            },
            {
                id: 35,
                method: "custom"
            },
            {
                id: 36,
                method: "assert"
            },
            {
                id: 37,
                method: "balance_claim"
            },
            {
                id: 38,
                method: "override_transfer"
            },
            {
                id: 39,
                method: "transfer_to_blind"
            },
            {
                id: 40,
                method: "blind_transfer"
            },
            {
                id: 41,
                method: "transfer_from_blind"
            },
            {
                id: 43,
                method: "asset_claim_fees"
            },
            {
                id: 45,
                method: "bid_collateral"
            },
            {
                id: 47,
                method: "asset_claim_pool"
            },
            {
                id: 48,
                method: "asset_update_issuer"
            },
            {
                id: 49,
                method: "htlc_create"
            },
            {
                id: 50,
                method: "htlc_redeem"
            },
            {
                id: 52,
                method: "htlc_extend"
            },
            {
                id: 54,
                method: "custom_authority_create"
            },
            {
                id: 55,
                method: "custom_authority_update"
            },
            {
                id: 56,
                method: "custom_authority_delete"
            },
            {
                id: 57,
                method: "ticket_create"
            },
            {
                id: 58,
                method: "ticket_update"
            },
            {
                id: 59,
                method: "liquidity_pool_create"
            },
            {
                id: 60,
                method: "liquidity_pool_delete"
            },
            {
                id: 61,
                method: "liquidity_pool_deposit"
            },
            {
                id: 62,
                method: "liquidity_pool_withdraw"
            },
            {
                id: 63,
                method: "liquidity_pool_exchange"
            },
            {
                id: 64,
                method: "samet_fund_create"
            },
            {
                id: 65,
                method: "samet_fund_delete"
            },
            {
                id: 66,
                method: "samet_fund_update"
            },
            {
                id: 67,
                method: "samet_fund_borrow"
            },
            {
                id: 68,
                method: "samt_fund_repay"
            },
            {
                id: 69,
                method: "credit_offer_create"
            },
            {
                id: 70,
                method: "credit_offer_delete"
            },
            {
                id: 71,
                method: "credit_offer_update"
            },
            {
                id: 72,
                method: "credit_offer_accept"
            },
            {
                id: 73,
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
      return new Promise(async (resolve, reject) => {
        let before = new Date();
        let beforeTS = before.getTime();

        let socket = new Socket(url);
        socket.on('connect', () => {
          let now = new Date();
          let nowTS = now.getTime();
          socket.destroy();
          return resolve({ url: url, lag: nowTS - beforeTS });
        });

        socket.on('error', (error) => {
          console.log(error);
          socket.destroy();
          return resolve(null);
        });
      });
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
    * @param {String} targetAccount
    * @returns {Array}
    */
    getBlockedAccounts(targetAccount) {
        return new Promise(async (resolve, reject) => {
            let targetAccountContents;
            try {
                targetAccountContents = await this.getAccount(targetAccount);
            } catch (error) {
                console.log(error);
                return resolve({id: '', blocked: false, error: true});
            }
            let targetID = targetAccountContents.id;

            if (this._config.identifier === "BTS_TEST") {
                return resolve({id: targetID, blocked: false});
            }

            let committeeAccountDetails;
            try {
                committeeAccountDetails = await this.getAccount('committee-blacklist-manager');
            } catch (error) {
                console.log(error);
                return resolve({id: '', blocked: false, error: true});
            }
            
            if (!targetAccountContents || !committeeAccountDetails) {
                return resolve({id: '', blocked: false, error: true});
            }

            let blockedAccounts = committeeAccountDetails.blacklisted_accounts;
            let isBlocked = blockedAccounts.find(x => x === targetID);
            
            return resolve({
                id: targetID,
                blocked: isBlocked ? true : false
            });
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
        return new Promise(async (resolve, reject) => {
              this.ensureConnection().then(() => {
                Apis.instance()
                    .db_api()
                    .exec("get_full_accounts", [[accountName], false])
                    .then(response => {
                        if (!response || !response.length || !response[0].length) {
                            console.log('Failed to query BTS blockchain');
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
        return new Promise((resolve, reject) => {
            this.ensureConnection().then(() => {
                Apis.instance().db_api().exec("lookup_asset_symbols", [[assetSymbolOrId]]).then((asset_objects) => {
                    if (asset_objects.length && asset_objects[0]) {
                        resolve(asset_objects[0]);
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
    getAsset(assetSymbolOrId) {
        return new Promise((resolve, reject) => {

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
              }).catch(reject);
          }).catch(reject);
        });
    }

    /*
     * Retrieve the Bitshares balances for the provided account name.
     * @param {String} accountName
     * @returns {Array} balances
     */
    getBalances(accountName) {
        return new Promise((resolve, reject) => {
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
            }).catch(reject);
        });
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
                    }).catch(reject);
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
            }).catch(reject);
        });
    }

    /*
     * Retrieve operation from input data and account combination
     * @param {Object} data
     * @param {Object} account
     * @returns {Object}
     */
    getOperation(data, account) {
        return new Promise((resolve, reject) => {
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
            }).catch(reject);
        });
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
            // resolve id to name
            return await this._getAccountName(thing);
        }

        let operations = [];
        let tr = this._parseTransactionBuilder(thing);

        for (let i = 0; i < tr.operations.length; i++) {
            let operation = tr.operations[i];
            if (operation[0] == 0) {
                let from;
                try {
                  from = await this._getAccountName(operation[1].from);
                } catch (error) {
                  console.log(error);
                  return;
                }

                let to;
                try {
                  to = await this._getAccountName(operation[1].to);
                } catch (error) {
                  console.log(error);
                  return;
                }

                let asset;
                try {
                  asset = await this._resolveAsset(operation[1].amount.asset_id);
                } catch (error) {
                  console.log(error);
                  return;
                }

                operations.push(
                    from + " &#9657; " + formatAsset(operation[1].amount.amount, asset.symbol, asset.precision) + " &#9657; " + to
                )
            } else if (operation[0] == 25) {
                let to;
                try {
                  to = await this._getAccountName(operation[1].authorized_account);
                } catch (error) {
                  console.log(error);
                  return;
                }

                let asset;
                try {
                  asset = await this._resolveAsset(operation[1].withdrawal_limit.asset_id);
                } catch (error) {
                  console.log(error);
                  return;
                }

                let period = operation[1].withdrawal_period_sec / 60 / 60 / 24;
                operations.push(
                    "Direct Debit Authorization\n" +
                    " Recipient: " + to + "\n" +
                    " Take " + formatAsset(operation[1].withdrawal_limit.amount, asset.symbol, asset.precision) + " every " + period + " days, for " + operation[1].periods_until_expiration + " periods"
                )
            } else if (operation[0] == 33) {
                let owner;
                try {
                  owner = await this._getAccountName(operation[1].owner);
                } catch (error) {
                  console.log(error);
                  return;
                }

                let asset;
                try {
                  asset = await this._resolveAsset(operation[1].amount.asset_id);
                } catch (error) {
                  console.log(error);
                  return;
                }

                operations.push(
                    "Vesting Balance\n" +
                    " Claim " + formatAsset(operation[1].amount.amount, asset.symbol, asset.precision) + " from balance " + operation[1].vesting_balance
                )
            } else if (operation[0] == 1) {
                let seller;
                try {
                  seller = await this._getAccountName(operation[1].seller);
                } catch (error) {
                  console.log(error);
                  return;
                }

                let buy;
                try {
                  buy = await this._resolveAsset(operation[1].min_to_receive.asset_id);
                } catch (error) {
                  console.log(error);
                  return;
                }

                let sell;
                try {
                  sell = await this._resolveAsset(operation[1].amount_to_sell.asset_id);
                } catch (error) {
                  console.log(error);
                  return;
                }

                let fillOrKill = operation[1].amount_to_sell.fill_or_kill;

                let price = humanReadableFloat(operation[1].amount_to_sell.amount, sell.precision)
                    / humanReadableFloat(operation[1].min_to_receive.amount, buy.precision);

                operations.push(
                    "Trade" + (fillOrKill ? "(Fill or Kill)" : "") + "\n" +
                    " Sell: " + formatAsset(operation[1].amount_to_sell.amount, sell.symbol, sell.precision) + "\n" +
                    " Buy: " + formatAsset(operation[1].min_to_receive.amount, buy.symbol, buy.precision) + "\n" +
                    " Price: " + price.toPrecision(6) + " " + sell.symbol + "/" +  buy.symbol
                )
            } else if (operation[0] == 10 || operation[0] == 11) {
                // Create or Update an asset


                let op = operation[1];

                let asset;
                if (operation[0] == 11) {
                    // fetch asset to update
                    try {
                      asset = await this._resolveAsset(operation[1].asset_to_update);
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
            }
        }

        if (!operations.length) {
            return false;
        }

        let header = operations.length == 1 ? "" : "Transaction\n";

        return `${header}${operations.join('\n')}`;
    }

}
