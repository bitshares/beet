import BlockchainAPI from "./BlockchainAPI";
import {Apis} from "bitsharesjs-ws";
import {
    PrivateKey,
    PublicKey,
    TransactionBuilder,
    Signature
} from "bitsharesjs";
import * as Socket from "simple-websocket";

import RendererLogger from "../RendererLogger";
import {formatAsset, humanReadableFloat} from "../assetUtils";
const logger = new RendererLogger();

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
              console.log(`Fastest node: ${sortedNodes[0].url}`);

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
                console.log('Checking node connections')
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
                        return reject(error);
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

    /*
     * Broadcast a transfer operation on the Bitshares blockchain.
     * @param {String} key
     * @param {String} from
     * @param {String} to
     * @param {String} amount
     * @param {String} memo
     * @returns {Object} transfer result
     */
    async transfer(key, from, to, amount, memo = null) {
        if (!amount.amount || !amount.asset_id) {
            throw "Amount must be a dict with amount and asset_id as keys"
        }
        from = await this.getAccount(from);
        to = await this.getAccount(to);

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
                    memo: memo == null ? undefined : memo
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
            }
        }

        if (!operations.length) {
            return false;
        }

        let header = operations.length == 1 ? "" : "Transaction\n";

        return `${header}${operations.join('\n')}`;
    }

}
