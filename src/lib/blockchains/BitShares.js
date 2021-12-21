import BlockchainAPI from "./BlockchainAPI";
import {Apis} from "bitsharesjs-ws";
import {
    PrivateKey,
    PublicKey,
    TransactionBuilder,
    Signature,
    FetchChain
} from "bitsharesjs";
import RendererLogger from "../RendererLogger";
import {formatAsset, humanReadableFloat} from "../assetUtils";
const logger = new RendererLogger();

export default class BitShares extends BlockchainAPI {

    _connect(nodeToConnect = null) {
        return new Promise((resolve, reject) => {
            if (nodeToConnect == null) {
                nodeToConnect = this.getNodes()[0].url;
            }
            if (this._isConnected) {
                Apis.close().then(() => {
                    this._isConnected = false;
                    Apis.instance(
                        nodeToConnect,
                        true,
                        10000,
                        {enableCrypto: false, enableOrders: false},
                        // no use in firing reject because it might happen at any time in the future after connecting!
                        this._connectionFailed.bind(this, null, nodeToConnect, "Connection closed")
                    ).init_promise.then(() => {
                        this._connectionEstablished(resolve, nodeToConnect);
                    }).catch(this._connectionFailed.bind(this, reject, nodeToConnect));
                });
            } else {
                Apis.instance(
                    nodeToConnect,
                    true,
                    10000,
                    {enableCrypto: false, enableOrders: false},
                    // no use in firing reject because it might happen at any time in the future after connecting!
                    this._connectionFailed.bind(this, null, nodeToConnect, "Connection closed")
                ).init_promise.then(() => {
                    this._connectionEstablished(resolve, nodeToConnect);
                }).catch(this._connectionFailed.bind(this, reject, nodeToConnect));
            }
        });
    }

    _needsReconnecting() {
        if (this._isConnected) {
            let _isConnectedToTestnet = Apis.instance().url.indexOf("testnet") !== -1;
            return _isConnectedToTestnet !== this._isTestnet();
        } else {
            return false;
        }
    }

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

    getAccount(accountName) {
        return new Promise((resolve, reject) => {
            this.ensureConnection().then(() => {
                Apis.instance().db_api()
                    .exec("get_full_accounts", [[accountName], false])
                    .then(res => {
                        res[0][1].account.active.public_keys = res[0][1].account.active.key_auths;
                        res[0][1].account.owner.public_keys = res[0][1].account.owner.key_auths;
                        res[0][1].account.memo = {public_key: res[0][1].account.options.memo_key};
                        res[0][1].account.balances = res[0][1].balances;
                        resolve(res[0][1].account);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            }).catch(reject);
        });
    }

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

    getAsset(assetSymbolOrId) {
        if (this._isTestnet()) {
            if (assetSymbolOrId == "1.3.0") {
                return {
                    asset_id: "1.3.0",
                    symbol: "TEST",
                    precision: 5
                };
            } else {
                return null;
            }
        } else {
            if (assetSymbolOrId == "1.3.0") {
                return {
                    asset_id: "1.3.0",
                    symbol: "BTS",
                    precision: 5
                };
            } else if (assetSymbolOrId == "1.3.121") {
                return {
                    asset_id: "1.3.121",
                    symbol: "bitUSD",
                    precision: 4
                };
            } else if (assetSymbolOrId == "1.3.113") {
                return {
                    asset_id: "1.3.113",
                    symbol: "bitCNY",
                    precision: 4
                };
            } else if (assetSymbolOrId == "1.3.120") {
                return {
                    asset_id: "1.3.120",
                    symbol: "bitEUR",
                    precision: 4
                };
            } else {
                return null;
            }
        }
    }

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
            }).catch(reject);
        });
    }

    getPublicKey(privateKey) {
        return PrivateKey.fromWif(privateKey)
            .toPublicKey()
            .toString(this._getCoreSymbol());
    }

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
                                }).catch(err => reject(err));
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
                                }).catch(err => reject(err));
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
                                }).catch(err => reject(err));
                                break;
                        }
                    }).catch(err => reject(err));
                }
            }).catch(reject);
        });
    }

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

    sign(operation, key) {
        return new Promise((resolve, reject) => {
            this.ensureConnection().then(() => {
                let tr = this._parseTransactionBuilder(operation);
                Promise.all([
                    tr.set_required_fees(),
                    tr.update_head_block()
                ]).then(() => {
                    let privateKey = PrivateKey.fromWif(key);
                    tr.add_signer(privateKey, privateKey.toPublicKey().toPublicKeyString(this._getCoreSymbol()));
                    tr.finalize().then(() => {
                        tr.sign();
                        resolve(tr);
                    }).catch(reject);
                });
            }).catch(err => reject(err));
        });
    }

    broadcast(transaction) {
        return new Promise((resolve, reject) => {
            this.ensureConnection().then(() => {
                transaction = this._parseTransactionBuilder(transaction);
                transaction.broadcast().then(id => {
                    resolve(id);
                }).catch(err => reject(err));
            }).catch(reject);
        });
    }

    getOperation(data, account) {
        let account_id = account.id;
        return new Promise((resolve, reject) => {
            this.ensureConnection().then(() => {
                let operation = {
                    type: null,
                    data: null
                };
                let api = Apis.instance();
                switch (data.action) {
                    case 'vote': {
                        operation.type = 'account_update';
                        api.db_api().exec(
                            "get_objects",
                            [[account_id]]
                        ).then((accounts) => {
                            let updateObject = {
                                account: account_id
                            };

                            let account = accounts[0];

                            let new_options = account.options;

                            if (new_options.votes.findIndex(item => item == data.vote_id) !== -1) {
                                resolve({
                                   vote_id: data.vote_id,
                                   notingToDo: true
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
                            updateObject.new_options = new_options;
                            operation.data = updateObject;
                            resolve(operation);
                        }).catch(err => {
                            reject(err);
                        });

                    }
                    break;
                    default: {
                        operation.type = 'transfer';
                        operation.data = data;
                        resolve(operation);
                    }
                }
            }).catch(reject);
        });
    }

    _signString(key, string) {
        let signature = Signature.signBuffer(
            string,
            PrivateKey.fromWif(key)
        );
        return signature.toHex();
    }

    _verifyString(signature, publicKey, string) {
        let _PublicKey = PublicKey;
        let sig = Signature.fromHex(signature);
        let pkey = PublicKey.fromPublicKeyString(publicKey, this._getCoreSymbol());
        return sig.verifyBuffer(
            string,
            pkey
        );
    }

    async transfer(key, from, to, amount, memo = null) {
        if (!amount.amount || !amount.asset_id) {
            throw "Amount must be a dict with amount and asset_id as keys"
        }
        from = await this.getAccount(from);
        to = await this.getAccount(to);
        let operation = {
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
        };
        let transaction = await this.sign(operation, key);
        return await this.broadcast(transaction);
    }

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

    getSignUpInput() {
        return {
            active: false,
            memo: true,
            owner: false
        }
    }

    async visualize(thing) {
        if (typeof thing == "string" && thing.startsWith("1.2.")) {
            // resolve id to name
            return this._getAccountName(thing);
        }
        let operations = [];
        let tr = this._parseTransactionBuilder(thing);
        console.log("Visualizing " + tr);
        for (let i = 0; i < tr.operations.length; i++) {
            let operation = tr.operations[i];
            if (operation[0] == 0) {
                let from = await this._getAccountName(operation[1].from);
                let to = await this._getAccountName(operation[1].to);
                let asset = await this._resolveAsset(operation[1].amount.asset_id);

                operations.push(
                    from + " &#9657; " + formatAsset(operation[1].amount.amount, asset.symbol, asset.precision) + " &#9657; " + to
                )
            } else if (operation[0] == 25) {
                let to = await this._getAccountName(operation[1].authorized_account);
                let asset = await this._resolveAsset(operation[1].withdrawal_limit.asset_id);
                let period = operation[1].withdrawal_period_sec / 60 / 60 / 24;
                operations.push(
                    "Direct Debit Authorization\n" +
                    " Recipient: " + to + "\n" +
                    " Take " + formatAsset(operation[1].withdrawal_limit.amount, asset.symbol, asset.precision) + " every " + period + " days, for " + operation[1].periods_until_expiration + " periods"
                )
            } else if (operation[0] == 33) {
                let owner = await this._getAccountName(operation[1].owner);
                let asset = await this._resolveAsset(operation[1].amount.asset_id);
                operations.push(
                    "Vesting Balance\n" +
                    " Claim " + formatAsset(operation[1].amount.amount, asset.symbol, asset.precision) + " from balance " + operation[1].vesting_balance
                )
            } else if (operation[0] == 1) {
                let seller = await this._getAccountName(operation[1].seller);
                let buy = await this._resolveAsset(operation[1].min_to_receive.asset_id);
                let sell = await this._resolveAsset(operation[1].amount_to_sell.asset_id);
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
        if (operations.length == 0) {
            return false;
        }
        let header = operations.length == 1 ? "" : "Transaction\n";


        return `<pre class="text-left custom-content">
<code>${header}${operations.join('\n')}
</code></pre>`;
    }

}
