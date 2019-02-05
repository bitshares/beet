import BlockchainAPI from "./BlockchainAPI";
import wlsjs from "@whaleshares/wlsjs";
import Signature from "@whaleshares/wlsjs/lib/auth/ecc/src/signature";
import KeyPrivate from "@whaleshares/wlsjs/lib/auth/ecc/src/key_private";
import PublicKey from "@whaleshares/wlsjs/lib/auth/ecc/src/key_public";


export default class WhaleShares extends BlockchainAPI {

    isConnected() {
        return this._isConnected;
    }

    connect(nodeToConnect, onClose = null) {
        return new Promise((resolve, reject) => {
            // steem library handles connection internally, just set node
            //wlsjs.api.setOptions({ url: nodeToConnect });
            resolve();
        });
    }

    getAccount(accountname) {
        return new Promise((resolve, reject) => {
            wlsjs.api.getAccounts([accountname], function(err, result) {
                if (result.length == 0) {
                    reject("Account " + accountname + " not found!");
                    return;
                }
                result[0].active.public_keys = result[0].active.key_auths;
                result[0].owner.public_keys = result[0].owner.key_auths;
                result[0].memo = {public_key: result[0].memo_key};
                resolve(result[0]);
            }).then(err => {
                console.log(err);
            }).catch(err => {
                console.log("c", err);
            });
        });
    }

    getPublicKey(privateKey) {
        return wlsjs.auth.wifToPublic(privateKey);
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
                            wlsjs.broadcast.vote(
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
                            wlsjs.broadcast.customJson(
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
                        wlsjs.broadcast[operationName](
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

    signMessage(key, accountName, randomString) {
        return new Promise((resolve,reject) => {
            // do as a list, to preserve order
            let message = JSON.stringify([
                "from",
                accountName,
                this.getPublicKey(key),
                "time",
                new Date().toUTCString(),
                "text",
                randomString
            ]);
            try {
                let signature = Signature.signBuffer(
                    message,
                    KeyPrivate.fromWif(key)
                );
                resolve({
                    payload: message,
                    signature: signature.toHex()
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    verifyMessage(signedMessage) {
        return new Promise((resolve, reject) => {
            if (typeof signedMessage.payload === "string" || signedMessage.payload instanceof String) {
                signedMessage.signed = signedMessage.payload;
                signedMessage.payload = JSON.parse(signedMessage.payload);
            }

            // validate account and key
            this._verifyAccountAndKey(signedMessage.payload[1], signedMessage.payload[2]).then(
                found => {
                    if (found.account == null) {
                        reject("invalid user");
                    }
                    // verify message signed
                    let verified = false;
                    try {
                        verified = Signature.fromHex(signedMessage.signature).verifyBuffer(
                            signedMessage.signed,
                            PublicKey.fromStringOrThrow(signedMessage.payload[2])
                        );
                    } catch (err) {
                        // wrap message that could be raised from Signature
                        reject("Error verifying signature");
                    }
                    if (!verified) {
                        reject("Invalid signature");
                    }
                    return resolve(signedMessage);
                }
            ).catch(err => {
                reject(err);
            });
        });
    }

}