import BlockchainAPI from "./BlockchainAPI";
import steem from "steem";
import Signature from "steem/lib/auth/ecc/src/signature";
import KeyPrivate from "steem/lib/auth/ecc/src/key_private";
import PublicKey from "steem/lib/auth/ecc/src/key_public";

export default class Steem extends BlockchainAPI {

    // https://github.com/steemit/steem-js/tree/master/doc#broadcast-api

    isConnected() {
        return this._isConnected;
    }

    connect(nodeToConnect, onClose = null) {
        return new Promise((resolve, reject) => {
            // steem library handles connection internally, just set node
            //steem.api.setOptions({ url: nodeToConnect });
            resolve();
        });
    }

    getAccount(accountname) {
        return new Promise((resolve, reject) => {
            steem.api.getAccounts([accountname], function(err, result) {
                if (result.length == 0) {
                    reject("Account " + accountname + " not found!");
                    return;
                }
                result[0].active.public_keys = result[0].active.key_auths;
                result[0].owner.public_keys = result[0].owner.key_auths;
                result[0].memo = {public_key: result[0].memo_key};
                resolve(result[0]);
            });
        });
    }

    getPublicKey(privateKey) {
        return steem.auth.wifToPublic(privateKey);
    }

    getBalances(accountName) {
        return new Promise((resolve, reject) => {
            this.getAccount(accountName).then((account) => {
                let balances = [];
                balances.push({
                    asset_type: "UIA",
                    asset_name: "STEEM",
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
        });
    }

    _ensureAPI() {
        // nothing to do for steem yet
        return new Promise(resolve => {
            resolve();
        });
    }

    sign(operation, key) {
        console.log("sign", operation, key);
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                if (!!operation.type) {
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

            }).catch(err => reject(err));;
        });
    }

    broadcast(transaction) {
        console.log("broadcast", transaction);
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                if (!!transaction.type) {
                    switch (transaction.type) {
                        case 'vote': {
                            steem.broadcast.vote(
                                transaction.wif,
                                transaction.data.username,
                                transaction.data.author,
                                transaction.data.permlink,
                                transaction.data.weight,
                                (err, result) => {
                                    console.log("vote result", err, result);
                                    resolve(result);
                                }
                            );
                            break;
                        }
                        case "customJSON": {
                            steem.broadcast.customJson(
                                transaction.wif, //transaction.wif,
                                transaction.data.requiredAuths,
                                transaction.data.requiredPostingAuths,
                                transaction.data.id,
                                transaction.data.json,
                                (err, result) => {
                                    console.log("customJson result", err, result);
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
                        steem.broadcast[operationName](
                            ...transaction,
                            (err, result) => {
                                console.log("injectedCall result", err, result);
                                if (!!err) {
                                    reject(err);
                                }
                                resolve(result);
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
        let steeem = steem;
        console.log("getOperation", data, account);
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                switch (data.action) {
                    case 'vote': {
                        resolve({
                            type: "vote",
                            data: {
                                username: account.name,
                                author: data.params.author,
                                permlink: data.params.permlink,
                                weight: data.params.weight
                            }
                        })
                    }
                }
            });
        });
    }

    mapOperationData(incoming) {
        console.log("mapOperationData", incoming);
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                if (incoming.action == "vote") {
                    resolve({
                        entity: "Post",
                        description:
                            "Author: " + incoming.params.author +
                            "\nPost: " + incoming.params.permlink +
                            "\nWeight: " + incoming.params.weight,
                        vote: incoming.params
                    });
                }
            });
        });
    }

    _signString(key, string) {
        let signature = Signature.signBuffer(
            string,
            KeyPrivate.fromWif(key)
        );
        return signature.toHex();
    }

    _verifyString(signature, publicKey, string) {
        return Signature.fromHex(signature).verifyBuffer(
            string,
            PublicKey.fromStringOrThrow(publicKey)
        );
    }

}