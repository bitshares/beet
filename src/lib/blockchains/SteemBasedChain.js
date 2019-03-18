import BlockchainAPI from "./BlockchainAPI";

export default class SteemBasedChain extends BlockchainAPI {

    _getSignature() {
        throw "Needs implementation"
    }

    _getPrivateKey() {
        throw "Needs implementation"
    }

    _getPublicKey() {
        throw "Needs implementation";
    }

    _getLibrary() {
        throw "Needs implementation";
    }

    _getCoreToken() {
        throw "Needs implementation";
    }

    isConnected() {
        return this._isConnected;
    }

    connect(nodeToConnect, onClose = null) {
        return new Promise((resolve, reject) => {
            if (nodeToConnect == null) {
                nodeToConnect = this.getNodes()[0].url;
            }
            // steem library handles connection internally, just set node
            this._getLibrary().api.setOptions({ url: nodeToConnect });
            
            this._connectionEstablished(resolve, nodeToConnect);
        });
    }

    getAccount(accountname) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                this._getLibrary().api.getAccounts([accountname], function(err, result) {
                    if (result.length == 0) {
                        reject("Account " + accountname + " not found!");
                        return;
                    }
                    result[0].active.public_keys = result[0].active.key_auths;
                    result[0].owner.public_keys = result[0].owner.key_auths;
                    result[0].memo = {public_key: result[0].memo_key};
                    resolve(result[0]);
                });
            }).catch(reject);
        });
    }

    getPublicKey(privateKey) {
        return this._getLibrary().auth.wifToPublic(privateKey);
    }

    getBalances(accountName) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                this.getAccount(accountName).then((account) => {
                    let balances = [];
                    balances.push({
                        asset_type: "UIA",
                        asset_name: this._getCoreToken(),
                        balance: parseFloat(account.balance),
                        owner: "-",
                        prefix: ""
                    });
                    balances.push({
                        asset_type: "UIA",
                        asset_name: "VESTS",
                        balance: parseFloat(account.vesting_shares),
                        owner: "-",
                        prefix: ""
                    });
                    balances.push({
                        asset_type: "UIA",
                        asset_name: "SDB",
                        balance: parseFloat(account.sbd_balance),
                        owner: "-",
                        prefix: ""
                    });
                    balances.push({
                        asset_type: "UIA",
                        asset_name: "SP",
                        balance: parseFloat(account.reward_vesting_steem),
                        owner: "-",
                        prefix: ""
                    });
                    resolve(balances);
                });
            }).catch(reject);
        });
    }

    _ensureAPI() {
        // nothing to do for steem yet
        return new Promise((resolve, reject) => {
            this.connect().then(resolve).catch(reject);
        });
    }

    sign(operation, key) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                if (operation.type) {
                    switch (operation.type) {
                        case 'vote': {
                            // do actual transaction building
                            operation.wif = key;
                            resolve(operation);
                            break;
                        }
                        default:
                            operation.wif = key;
                            resolve(operation);
                    }
                } else {
                    if (typeof operation == "object"
                        && operation.length > 2
                        && operation[1] == "inject_wif") {
                        operation[1] = key;
                        resolve(operation);
                    } else {
                        reject("Unknown sign request");
                    }
                }

            }).catch(err => reject(err));
        });
    }

    broadcast(transaction) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                if (transaction.type) {
                    switch (transaction.type) {
                        case 'vote': {
                            if (!!transaction.data.author) {
                                this._getLibrary().broadcast.vote(
                                    transaction.wif,
                                    transaction.data.username,
                                    transaction.data.author,
                                    transaction.data.permlink,
                                    transaction.data.weight,
                                    (err, result) => {
                                        resolve(result);
                                    }
                                );
                            } else {
                                this._getLibrary().broadcast.accountWitnessVote(
                                    transaction.wif,
                                    transaction.data.username,
                                    transaction.data.witness,
                                    transaction.data.approve,
                                    (err, result) => {
                                        resolve(result);
                                    }
                                );
                            }
                            break;
                        }
                        case "customJSON": {
                            this._getLibrary().broadcast.customJson(
                                transaction.wif, //transaction.wif,
                                transaction.data.requiredAuths,
                                transaction.data.requiredPostingAuths,
                                transaction.data.id,
                                transaction.data.json,
                                (err, result) => {
                                    resolve(result);
                                }
                            );
                            break;
                        }
                        default: {
                            reject("not broadcast")
                        }
                    }
                } else {
                    if (typeof transaction == "object"
                        && transaction.length > 3
                        && typeof transaction[0] == "string") {
                        let operationName = transaction.shift();
                        this._getLibrary().broadcast[operationName](
                            ...transaction,
                            (err, result) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(result);
                                }
                            }
                        );
                    } else {
                        reject("Unknown broadcast request");
                    }

                }

            }).catch(err => reject(err));
        });
    }

    getOperation(data, account) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                switch (data.action) {
                    case 'vote': {
                        if (!!data.params.author) {
                            resolve({
                                type: "vote",
                                data: {
                                    username: account.name,
                                    author: data.params.author,
                                    permlink: data.params.permlink,
                                    weight: data.params.weight
                                }
                            });
                        } else {
                            resolve({
                                type: "vote",
                                data: {
                                    username: account.name,
                                    witness: data.params.witness,
                                    approve: data.params.approve
                                }
                            });
                        }
                    }
                }
            });
        });
    }

    mapOperationData(incoming) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                if (incoming.action == "vote") {
                    if (!!incoming.params.author) {
                        resolve({
                            entity: "Post",
                            description:
                                "Author: " + incoming.params.author +
                                "\nPost: " + incoming.params.permlink +
                                "\nWeight: " + incoming.params.weight,
                            vote: incoming.params
                        });
                    } else {
                        resolve({
                            entity: "Witness",
                            description:
                                "Account Name: " + incoming.params.witness +
                                "\nApprove: " + incoming.params.approve,
                            vote: incoming.params
                        });
                    }
                }
            });
        });
    }

    _signString(key, string) {
        let signature = this._getSignature().signBuffer(
            string,
            this._getPrivateKey().fromWif(key)
        );
        return signature.toHex();
    }

    _verifyString(signature, publicKey, string) {
        return this._getSignature().fromHex(signature).verifyBuffer(
            string,
            this._getPublicKey().fromStringOrThrow(publicKey)
        );
    }

    transfer(key, from, to, amount, memo = null) {
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                this._getLibrary().broadcast.transfer(
                    key,
                    from,
                    to,
                    amount,
                    memo,
                    (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    }
                );
            });
        });
    }


}