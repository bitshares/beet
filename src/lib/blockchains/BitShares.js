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

        //  https://github.com/bitshares/bitsharesjs/blob/master/lib/serializer/src/operations.js#L1551
        for (let i = 0; i < tr.operations.length; i++) {
            let operation = tr.operations[i];
            const operationType = operation[0];
            const op = operation[1];
            if (operationType == 0) {
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

                operations.push(
                    from + " &#9657; " + formatAsset(op.amount.amount, asset.symbol, asset.precision) + " &#9657; " + to
                )
            } else if (operationType == 1) {
                // limit_order_create
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
                  return;
                }

                let sell;
                try {
                  sell = await this._resolveAsset(op.amount_to_sell.asset_id);
                } catch (error) {
                  console.log(error);
                  return;
                }

                let fillOrKill = op.amount_to_sell.fill_or_kill;

                let price = humanReadableFloat(op.amount_to_sell.amount, sell.precision)
                    / humanReadableFloat(op.min_to_receive.amount, buy.precision);

                operations.push(
                    "Trade" + (fillOrKill ? "(Fill or Kill)" : "") + "\n" +
                    " Sell: " + formatAsset(op.amount_to_sell.amount, sell.symbol, sell.precision) + "\n" +
                    " Buy: " + formatAsset(op.min_to_receive.amount, buy.symbol, buy.precision) + "\n" +
                    " Price: " + price.toPrecision(6) + " " + sell.symbol + "/" +  buy.symbol
                )
            } else if (operationType == 2) {
                // limit_order_cancel
                operations.push(
                    "Cancel the following limit order?\n" +
                    "Order ID: " + op.order + "\n" + 
                    "Estimated fee: " + op.fee + "\n" +
                    "Fee paying account:" + op.fee_paying_account
                )
            } else if (operationType == 3) {
                // call_order_update
                operations.push(
                    "Update your call order to the following?\n" +
                    "funding_account: " + op.funding_account + "\n" +
                    "delta_collateral" + op.delta_collateral + "\n" +
                    "delta_debt" + op.delta_debt + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 4) {
                // fill_order
                operations.push(
                    "Fill order: \n" +
                    "order_id: " + op.order_id + "\n" +
                    "account_id: " + op.account_id + "\n" +
                    "pays: " + op.pays + "\n" +
                    "receives: " + op.receives + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 5) {
                // account_create
                operations.push(
                    "Do you want to create the following account? \n" +
                    "registrar: " + op.registrar + "\n" +
                    "referrer: " + op.referrer + "\n" +
                    "referrer_percent: " + op.referrer_percent + "\n" +
                    "name " + op.name + "\n" +
                    "owner: " + op.owner + "\n" +
                    "active: " + op.active + "\n" +
                    "options: " + op.options + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 6) {
                // account_update
                operations.push(
                    "Do you want to approve this account update? \n" +
                    "Warning: This action is irreversible. \n" +
                    "authorizing_account: " + op.authorizing_account + "\n" +
                    "account_to_list: " + op.account_to_list + "\n" +
                    "new_listing: " + op.new_listing + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 7) {
                // account_whitelist
                operations.push(
                    "Account whitelist details: \n" +
                    "authorizing_account: " + op.authorizing_account + "\n" +
                    "account_to_list: " + op.account_to_list + "\n" +
                    "new_listing: " + op.new_listing + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 8) {
                // account_upgrade
                operations.push(
                    "Update account to lifetime member? \n" +
                    "account_to_upgrade: " + op.account_to_upgrade + "\n" +
                    "upgrade_to_lifetime_member: " + op.upgrade_to_lifetime_member + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 9) {
                // account_transfer
                operations.push(
                    "Transfer account to a new owner? \n" +
                    "Warning: This action is irreversible. \n" +
                    "account_id: " + op.account_id + "\n" +
                    "new_owner: " + op.new_owner + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 10 || operationType == 11) {
                // Create or Update an asset
                let asset;
                if (operationType == 11) {
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
            } else if (operationType == 12) {
                // asset_update_bitasset
                operations.push(
                    "Approve bitasset update? \n" +
                    "issuer: " + op.issuer + "\n" +
                    "asset_to_update: " + op.asset_to_update + "\n" +
                    "new_options: " + op.new_options + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 13) {
                // asset_update_feed_producers
                operations.push(
                    "Approve change to bitasset feed producers? \n" +
                    "issuer: " + op.issuer + "\n" +
                    "asset_to_update: " + op.asset_to_update + "\n" +
                    "new_feed_producers: " + op.new_feed_producers + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 14) {
                // asset_issue
                operations.push(
                    "Issue asset to the following user? \n" +
                    "issuer: " + op.issuer + "\n" +
                    "asset_to_issue: " + op.asset_to_issue + "\n" +
                    "issue_to_account: " + op.issue_to_account + "\n" +
                    "memo: " + op.memo + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 15) {
                // asset_reserve
                operations.push(
                    "Approve the following asset reservation? \n" +
                    "payer: " + op.payer + "\n" +
                    "amount_to_reserve: " + op.amount_to_reserve + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 16) {
                // asset_fund_fee_pool
                operations.push(
                    "Fund the following asset's fee pool? \n" +
                    "from_account: " + op.from_account + "\n" +
                    "asset_id: " + op.asset_id + "\n" +
                    "amount: " + op.amount + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 17) {
                // asset_settle
                operations.push(
                    "Settle the following asset for its backing collateral? \n" +
                    "account: " + op.account + "\n" +
                    "amount: " + op.amount + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 18) {
                // asset_global_settle
                operations.push(
                    "Perform global settlement on the following asset? \n" +
                    "issuer: " + op.issuer + "\n" +
                    "asset_to_settle: " + op.asset_to_settle + "\n" +
                    "settle_price: " + op.settle_price + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 19) {
                // asset_publish_feed
                operations.push(
                    "Publish a price feed for the following asset? \n" +
                    "publisher: " + op.publisher + "\n" +
                    "asset_id: " + op.asset_id + "\n" +
                    "feed: " + op.feed + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 20) {
                // witness_create
                operations.push(
                    "Create a witness with the following details? \n" +
                    "witness_account: " + op.witness_account + "\n" +
                    "url: " + op.url + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 21) {
                // witness_update
                operations.push(
                    "Update witness details to the following? \n" +
                    "witness: " + op.witness + "\n" +
                    "witness_account: " + op.witness_account + "\n" +
                    "new_url: " + op.new_url + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 22) {
                // proposal_create
                operations.push(
                    "Create the following proposal? \n" +
                    "expiration_time: " + op.expiration_time + "\n" +
                    "proposed_ops: " + op.proposed_ops + "\n" +
                    "review_period_seconds: " + op.review_period_seconds + "\n" +
                    "fee_paying_account: " + op.fee_paying_account + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 23) {
                // proposal_update
                operations.push(
                    "Update the following proposal details? \n" +
                    "proposal: " + op.proposal + "\n" +
                    "active_approvals_to_add: " + op.active_approvals_to_add + "\n" +
                    "active_approvals_to_remove: " + op.active_approvals_to_remove + "\n" +
                    "owner_approvals_to_add: " + op.owner_approvals_to_add + "\n" +
                    "owner_approvals_to_remove: " + op.owner_approvals_to_remove + "\n" +
                    "key_approvals_to_add: " + op.key_approvals_to_add + "\n" +
                    "key_approvals_to_remove: " + op.key_approvals_to_remove + "\n" +
                    "fee_paying_account: " + op.fee_paying_account + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 24) {
                // proposal_delete
                operations.push(
                    "Delete the following proposal? \n" +
                    "using_owner_authority: " + op.using_owner_authority + "\n" +
                    "proposal: " + op.proposal + "\n" +
                    "fee_paying_account: " + op.fee_paying_account + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 25) {
                //
                let to;
                try {
                  to = await this._getAccountName(op.authorized_account);
                } catch (error) {
                  console.log(error);
                  return;
                }

                let asset;
                try {
                  asset = await this._resolveAsset(op.withdrawal_limit.asset_id);
                } catch (error) {
                  console.log(error);
                  return;
                }

                let period = op.withdrawal_period_sec / 60 / 60 / 24;
                operations.push(
                    "Direct Debit Authorization\n" +
                    " Recipient: " + to + "\n" +
                    " Take " + formatAsset(op.withdrawal_limit.amount, asset.symbol, asset.precision) + " every " + period + " days, for " + op.periods_until_expiration + " periods"
                )
            } else if (operationType == 26) {
                // withdraw_permission_update
                operations.push(
                    "Update witness permissions to the following? \n" +
                    "withdraw_from_account: " + op.withdraw_from_account + "\n" +
                    "authorized_account: " + op.authorized_account + "\n" +
                    "permission_to_update: " + op.permission_to_update + "\n" +
                    "withdrawal_limit: " + op.withdrawal_limit + "\n" +
                    "withdrawal_period_sec: " + op.withdrawal_period_sec + "\n" +
                    "period_start_time: " + op.period_start_time + "\n" +
                    "periods_until_expiration: " + op.periods_until_expiration + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 27) {
                // withdraw_permission_claim
                operations.push(
                    "Claim the following withdrawal permission? \n" +
                    "withdraw_permission: " + op.withdraw_permission + "\n" +
                    "withdraw_from_account: " + op.withdraw_from_account + "\n" +
                    "withdraw_to_account: " + op.withdraw_to_account + "\n" +
                    "amount_to_withdraw: " + op.amount_to_withdraw + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 28) {
                // withdraw_permission_delete
                operations.push(
                    "Delete the following withdraw permission? \n" +
                    "withdraw_from_account: " + op.withdraw_from_account + "\n" +
                    "authorized_account: " + op.authorized_account + "\n" +
                    "withdrawal_permission: " + op.withdrawal_permission + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 29) {
                // committee_member_create
                operations.push(
                    "Create a committee member? \n" +
                    "committee_member_account: " + op.committee_member_account + "\n" +
                    "url: " + op.url + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 30) {
                // committee_member_update
                operations.push(
                    "Update the following committee member's details? \n" +
                    "committee_member: " + op.committee_member + "\n" +
                    "committee_member_account: " + op.committee_member_account + "\n" +
                    "new_url: " + op.new_url + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 31) {
                // committee_member_update_global_parameters
                operations.push(
                    "Approve of following global parameters as a committee? \n" +
                    "new_parameters: " + op.new_parameters + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 32) {
                // vesting_balance_create
                operations.push(
                    "Create the following vesting balance? \n" +
                    "vesting_balance: " + op.vesting_balance + "\n" +
                    "owner: " + op.owner + "\n" +
                    "amount: " + op.amount + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 33) {
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

                operations.push(
                    "Vesting Balance\n" +
                    " Claim " + formatAsset(op.amount.amount, asset.symbol, asset.precision) + " from balance " + op.vesting_balance
                )
            } else if (operationType == 34) {
                // worker_create
                operations.push(
                    "Create the following worker proposal? \n" +
                    "owner: " + op.owner + "\n" +
                    "work_begin_date: " + op.work_begin_date + "\n" +
                    "work_end_date: " + op.work_end_date + "\n" +
                    "daily_pay: " + op.daily_pay + "\n" +
                    "name: " + op.name + "\n" +
                    "url: " + op.url + "\n" +
                    "initializer: " + op.initializer + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 35) {
                // custom
                operations.push(
                    "Custom operation: \n" +
                    "payer: " + op.payer + "\n" +
                    "required_auths: " + op.required_auths + "\n" +
                    "id: " + op.id + "\n" +
                    "data: " + op.data + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 36) {
                // assert
                operations.push(
                    "Assert operation: \n" +
                    "deposit_to_account: " + op.deposit_to_account + "\n" +
                    "balance_to_claim: " + op.balance_to_claim + "\n" +
                    "balance_owner_key: " + op.balance_owner_key + "\n" +
                    "total_claimed: " + op.total_claimed + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 37) {
                // balance_claim
                operations.push(
                    "Claim the following balance? \n" +
                    "deposit_to_account: " + op.deposit_to_account + "\n" +
                    "balance_to_claim: " + op.balance_to_claim + "\n" +
                    "balance_owner_key: " + op.balance_owner_key + "\n" +
                    "total_claimed: " + op.total_claimed + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 38) {
                // override_transfer
                operations.push(
                    "Override the following transfer? \n" +
                    "issuer: " + op.issuer + "\n" +
                    "from: " + op.from + "\n" +
                    "to: " + op.to + "\n" +
                    "amount: " + op.amount + "\n" +
                    "memo: " + op.memo + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 39) {
                // transfer_to_blind
                operations.push(
                    "Transfer the following to blind? \n" +
                    "amount: " + op.amount + "\n" +
                    "from: " + op.from + "\n" +
                    "blinding_factor: " + op.blinding_factor + "\n" +
                    "outputs: " + op.outputs + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 40) {
                // blind_transfer
                operations.push(
                    "Approve the following blind transfer? \n" +
                    "inputs: " + op.inputs + "\n" +
                    "outputs: " + op.outputs + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 41) {
                // transfer_from_blind
                operations.push(
                    "Transfer from blind? \n" +
                    "amount: " + op.amount + "\n" +
                    "to: " + op.to + "\n" +
                    "blinding_factor: " + op.blinding_factor + "\n" +
                    "inputs: " + op.inputs + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 42) {
                // asset_settle_cancel
                operations.push(
                    "Cancel the following asset settlement? \n" +
                    "settlement: " + op.settlement + "\n" +
                    "account: " + op.account + "\n" +
                    "amount: " + op.amount + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 43) {
                // asset_claim_fees
                operations.push(
                    "Withdraw the fees from the following asset? \n" +
                    "issuer: " + op.issuer + "\n" +
                    "amount_to_claim: " + op.amount_to_claim + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 44) {
                // fba_distribute
                operations.push(
                    "Approve the following FBA Distribution? \n" +
                    "account_id: " + op.account_id + "\n" +
                    "fba_id: " + op.fba_id + "\n" +
                    "amount: " + op.amount + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 45) {
                // bid_collateral
                operations.push(
                    "Approve the following collateral bid? \n" +
                    "bidder: " + op.bidder + "\n" +
                    "additional_collateral: " + op.additional_collateral + "\n" +
                    "debt_covered: " + op.debt_covered + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 46) {
                // execute_bid
                operations.push(
                    "Approve the following collateral bid execution? \n" +
                    "bidder: " + op.bidder + "\n" +
                    "debt: " + op.debt + "\n" +
                    "collateral: " + op.collateral + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 47) {
                // asset_claim_pool
                operations.push(
                    "Claim assets from pool? \n" +
                    "issuer: " + op.issuer + "\n" +
                    "asset_id: " + op.asset_id + "\n" +
                    "amount_to_claim: " + op.amount_to_claim + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 48) {
                // asset_update_issuer
                operations.push(
                    "Update asset issuer? \n" +
                    "issuer: " + op.issuer + "\n" +
                    "asset_to_update: " + op.asset_to_update + "\n" +
                    "new_issuer: " + op.new_issuer + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 49) {
                // htlc_create
                operations.push(
                    "Create the following HTLC operaton? \n" +
                    "from: " + op.from + "\n" +
                    "to: " + op.to + "\n" +
                    "amount: " + op.amount + "\n" +
                    "preimage_hash: " + op.preimage_hash + "\n" +
                    "preimage_size: " + op.preimage_size + "\n" +
                    "claim_period_seconds: " + op.claim_period_seconds + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 50) {
                // htlc_redeem
                operations.push(
                    "Redeem the following HTLC operation? \n" +
                    "htlc_id: " + op.htlc_id + "\n" +
                    "redeemer: " + op.redeemer + "\n" +
                    "preimage: " + op.preimage + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 51) {
                // htlc_redeemed
                operations.push(
                    "Redeeming the following HTLC operation \n" +
                    "htlc_id: " + op.htlc_id + "\n" +
                    "from: " + op.from + "\n" +
                    "to: " + op.to + "\n" +
                    "amount: " + op.amount + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 52) {
                // htlc_extend
                operations.push(
                    "Approve the following HTLC extension? \n" +
                    "htlc_id: " + op.htlc_id + "\n" +
                    "update_issuer: " + op.update_issuer + "\n" +
                    "seconds_to_add: " + op.seconds_to_add + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 53) {
                // htlc_refund
                operations.push(
                    "Approve the following HTLC refund? \n" +
                    "htlc_id: " + op.htlc_id + "\n" +
                    "to: " + op.to + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 54) {
                // custom_authority_create
                operations.push(
                    "Create the following custom authority? \n" +
                    "account: " + op.account + "\n" +
                    "enabled: " + op.enabled + "\n" +
                    "valid_from: " + op.valid_from + "\n" +
                    "valid_to: " + op.valid_to + "\n" +
                    "operation_type: " + op.operation_type + "\n" +
                    "auth: " + op.auth + "\n" +
                    "restrictions: " + op.restrictions + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 55) {
                // custom_authority_update
                operations.push(
                    "Update the following custom authority? \n" +
                    "account: " + op.account + "\n" +
                    "authority_to_update: " + op.authority_to_update + "\n" +
                    "new_enabled: " + op.new_enabled + "\n" +
                    "new_valid_from: " + op.new_valid_from + "\n" +
                    "new_valid_to: " + op.new_valid_to + "\n" +
                    "new_auth: " + op.new_auth + "\n" +
                    "restrictions_to_remove: " + op.restrictions_to_remove + "\n" +
                    "restrictions_to_add: " + op.restrictions_to_add + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 56) {
                // custom_authority_delete
                operations.push(
                    "Delete the following custom authority? \n" +
                    "account: " + op.account + "\n" +
                    "authority_to_delete: " + op.authority_to_delete + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 57) {
                // ticket_create
                operations.push(
                    "Create the following ticket? \n" +
                    "account: " + op.account + "\n" +
                    "target_type: " + op.target_type + "\n" +
                    "amount: " + op.amount + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 58) {
                // ticket_update
                operations.push(
                    "Update the following ticket? \n" +
                    "ticket: " + op.ticket + "\n" +
                    "account: " + op.account + "\n" +
                    "target_type: " + op.target_type + "\n" +
                    "amount_for_new_target: " + op.amount_for_new_target + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 59) {
                // liquidity_pool_create
                operations.push(
                    "Create a liquidity pool with the following details? \n" +
                    "account: " + op.account + "\n" +
                    "asset_a: " + op.asset_a + "\n" +
                    "asset_b: " + op.asset_b + "\n" +
                    "share_asset: " + op.share_asset + "\n" +
                    "taker_fee_percent: " + op.taker_fee_percent + "\n" +
                    "withdrawal_fee_percent: " + op.withdrawal_fee_percent + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 60) {
                // liquidity_pool_delete
                operations.push(
                    "Delete the following liquidity pool? \n" +
                    "account: " + op.account + "\n" +
                    "pool: " + op.pool + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 61) {
                // liquidity_pool_deposit
                operations.push(
                    "Deposit into the following liquidity pool? \n" +
                    "account: " + op.account + "\n" +
                    "pool: " + op.pool + "\n" +
                    "amount_a: " + op.amount_a + "\n" +
                    "amount_b: " + op.amount_b + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 62) {
                // liquidity_pool_withdraw
                operations.push(
                    "Withdraw from the following liquidity pool? \n" +
                    "account: " + op.account + "\n" +
                    "pool: " + op.pool + "\n" +
                    "share_amount: " + op.share_amount + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 63) {
                // liquidity_pool_exchange
                operations.push(
                    "Approve of the following liquidity pool exchange? \n" +
                    "account: " + op.account + "\n" +
                    "pool: " + op.pool + "\n" +
                    "amount_to_sell: " + op.amount_to_sell + "\n" +
                    "min_to_receive: " + op.min_to_receive + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 64) {
                // samet_fund_create
                operations.push(
                    "Approve of the following samet fund creation? \n" +
                    "owner_account: " + op.owner_account + "\n" +
                    "asset_type: " + op.asset_type + "\n" +
                    "balance: " + op.balance + "\n" +
                    "fee_rate: " + op.fee_rate + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 65) {
                // samet_fund_delete
                operations.push(
                    "Deleting the following samet fund \n" +
                    "owner_account: " + op.owner_account + "\n" +
                    "fund_id: " + op.fund_id + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 66) {
                // samet_fund_update
                operations.push(
                    "Update the following samet fund? \n" +
                    "owner_account: " + op.owner_account + "\n" +
                    "fund_id: " + op.fund_id + "\n" +
                    "delta_amount: " + op.delta_amount + "\n" +
                    "new_fee_rate: " + op.new_fee_rate + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 67) {
                // samet_fund_borrow
                operations.push(
                    "Borrow from the folling samet fund? \n" +
                    "borrower: " + op.borrower + "\n" +
                    "fund_id: " + op.fund_id + "\n" +
                    "borrow_amount: " + op.borrow_amount + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 68) {
                // samet_fund_repay
                operations.push(
                    "Repay the following samet fund? \n" +
                    "account: " + op.account + "\n" +
                    "fund_id: " + op.fund_id + "\n" +
                    "repay_amount: " + op.repay_amount + "\n" +
                    "fund_fee: " + op.fund_fee + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 69) {
                // credit_offer_create
                operations.push(
                    "Approve the creation of the following credit offer? \n" +
                    "owner_account: " + op.owner_account + "\n" +
                    "asset_type: " + op.asset_type + "\n" +
                    "balance: " + op.balance + "\n" +
                    "fee_rate: " + op.fee_rate + "\n" +
                    "max_duration_seconds: " + op.max_duration_seconds + "\n" +
                    "min_deal_amount: " + op.min_deal_amount + "\n" +
                    "enabled: " + op.enabled + "\n" +
                    "auto_disable_time: " + op.auto_disable_time + "\n" +
                    "acceptable_collateral: " + op.acceptable_collateral + "\n" +
                    "acceptable_borrowers: " + op.acceptable_borrowers + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 70) {
                // credit_offer_delete
                operations.push(
                    "Delete the following credit offer? \n" +
                    "owner_account: " + op.owner_account + "\n" +
                    "offer_id: " + op.offer_id + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 71) {
                // credit_offer_update
                operations.push(
                    "Update the following credit offer? \n" +
                    "owner_account: " + op.owner_account + "\n" +
                    "offer_id: " + op.offer_id + "\n" +
                    "delta_amount: " + op.delta_amount + "\n" +
                    "fee_rate: " + op.fee_rate + "\n" +
                    "max_duration_seconds: " + op.max_duration_seconds + "\n" +
                    "min_deal_amount: " + op.min_deal_amount + "\n" +
                    "enabled: " + op.enabled + "\n" +
                    "auto_disable_time: " + op.auto_disable_time + "\n" +
                    "acceptable_collateral: " + op.acceptable_collateral + "\n" +
                    "acceptable_borrowers: " + op.acceptable_borrowers + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 72) {
                // credit_offer_accept
                operations.push(
                    "Approve of the following credit offer? \n" +
                    "borrower: " + op.borrower + "\n" +
                    "offer_id: " + op.offer_id + "\n" +
                    "borrow_amount: " + op.borrow_amount + "\n" +
                    "collateral: " + op.collateral + "\n" +
                    "max_fee_rate: " + op.max_fee_rate + "\n" +
                    "min_duration_seconds: " + op.min_duration_seconds + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 73) {
                // credit_deal_repay
                operations.push(
                    "Repay the following credit deal? \n" +
                    "account: " + op.account + "\n" +
                    "deal_id: " + op.deal_id + "\n" +
                    "repay_amount: " + op.repay_amount + "\n" +
                    "credit_fee: " + op.credit_fee + "\n" +
                    "Estimated fee: " + op.fee
                )
            } else if (operationType == 74) {
                // credit_deal_expired
                operations.push(
                    "Acknowledge credit deal expiration? \n" +
                    "deal_id: " + op.deal_id + "\n" +
                    "offer_id: " + op.offer_id + "\n" +
                    "offer_owner: " + op.offer_owner + "\n" +
                    "borrower: " + op.borrower + "\n" +
                    "unpaid_amount: " + op.unpaid_amount + "\n" +
                    "collateral: " + op.collateral + "\n" +
                    "fee_rate: " + op.fee_rate + "\n" +
                    "Estimated fee: " + op.fee
                )
            }
        }

        if (!operations.length) {
            return false;
        }

        let header = operations.length == 1 ? "" : "Transaction\n";

        return `${header}${operations.join('\n')}`;
    }

}
