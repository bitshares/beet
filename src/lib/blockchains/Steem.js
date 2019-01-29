import BlockchainAPI from "./BlockchainAPI";
import steem from "steem";

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
        let steeem = steem;
        console.log("sign", operation, key);
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
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

            }).catch(err => reject(err));;
        });
    }

    broadcast(transaction) {
        let steeem = steem;
        console.log("broadcast", transaction);
        return new Promise((resolve, reject) => {
            this._ensureAPI().then(() => {
                switch (transaction.action) {
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
                            transaction.wif,
                            transaction.requiredAuths,
                            transaction.requiredPostingAuths,
                            transaction.id,
                            transaction.json,
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

}