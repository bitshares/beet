import BlockchainAPI from "./BlockchainAPI";
import {Apis} from "bitsharesjs-ws";
import {
    PrivateKey,
    TransactionBuilder
} from "bitsharesjs";

export default class BitShares extends BlockchainAPI {

    _onCloseWrapper(onClose) {
        this._isConnected = false;
        if (onClose) onClose();
    }

    connect(nodeToConnect = null, onClose = null) {
        return new Promise((resolve, reject) => {
            if (nodeToConnect == null) {
                nodeToConnect = this.getNodes()[0].url;
            }
            if (this._isConnectingInProgress) {
                // there should be a promise queue for pending connects, this is the lazy way
                setTimeout(() => {
                    if (this._isConnected) {
                        resolve();
                    } else {
                        reject("multiple connects, did not resolve in time");
                    }
                }, 250);
                return;
            }
            this._isConnectingInProgress = true;
            if (this._isConnected) {
                Apis.close().then(() => {
                    this._isConnected = false;
                    Apis.instance(
                        nodeToConnect,
                        true,
                        10000,
                        {enableCrypto: false, enableOrders: false},
                        this._onCloseWrapper.bind(this, onClose)
                    ).init_promise.then(() => {
                        this._connectionEstablished(resolve, nodeToConnect);
                    }).catch((err) => {
                        this._isConnected = false;
                        this._isConnectingInProgress = false;
                        reject(err);
                    });
                });
            } else {
                Apis.instance(
                    nodeToConnect,
                    true,
                    10000,
                    {enableCrypto: false, enableOrders: false},
                    this._onCloseWrapper.bind(this, onClose)
                ).init_promise.then(() => {
                    this._connectionEstablished(resolve, nodeToConnect);
                }).catch((err) => {
                    this._isConnected = false;
                    this._isConnectingInProgress = false;
                    reject(err);
                });
            }
        });
    }

    _ensureAPI() {
        if (!this._isConnected) {
            return this.connect();
        }
        return new Promise(resolve => {
            resolve();
        });
    }

    getAccount(accountName) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
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
            });
        });
    }

    getBalances(accountName) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
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
                });
            });
        });
    }

    getPublicKey(privateKey) {
        return PrivateKey.fromWif(privateKey)
            .toPublicKey()
            .toString("BTS");
    }

    mapOperationData(incoming) {
        console.log("mapOperationData", incoming);
        return new Promise((resolve,reject) => {
            this._ensureAPI().then(() => {
                if (incoming.action == "vote") {
                    let entity_id = incoming.params.id.split(".");
                    if (entity_id[0] != "1") {
                        reject("ID format unknown");
                    }
                    if (entity_id[1] != "5" && entity_id[1] != "6" && entity_id[1] != "14") {
                        reject("Given object does not support voting");
                    }
                    Apis.instance().db_api().exec(
                        "get_objects", [[this.incoming.params.id]]
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
                                            this.incoming.params.id,
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
                                            this.incoming.params.id,
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
                                            this.incoming.params.id +
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
            });
        });
    }

    sign(operation, key) {
        console.log("sign", operation, key);
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                let tr = new TransactionBuilder();
                Apis.instance().init_promise.then(() => {
                    tr.add_type_operation(
                        incoming.op_type,
                        incoming.op_data
                    );
                    tr.set_required_fees().then(() => {
                        let privateKey = PrivateKey.fromWif(key);
                        tr.add_signer(privateKey, privateKey.toPublicKey().toPublicKeyString());
                        resolve(tr);
                    }).catch(err => reject(err));
                }).catch(err => reject(err));
            });
        });
    }

    broadcast(transaction) {
        console.log("broadcast", transaction);
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                transaction.broadcast().then(id => {
                    resolve(id);
                }).catch(err => reject(err));
            }).catch(err => reject(err));
        });
    }

    getOperation(data, account_id) {
        console.log("getOperation", data, account_id);
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
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
                            resolve(resolve);
                        }).catch(err => {
                            reject(err);
                        });

                    }
                }
            });
        });
    }
}