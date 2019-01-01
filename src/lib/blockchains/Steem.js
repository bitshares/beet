import BlockchainAPI from "./BlockchainAPI";
import steem from "steem";

export default class Steem extends BlockchainAPI {

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
                console.log(err, result);
                result[0].active.public_key = result[0].active.key_auths[0][0];
                result[0].owner.public_key = result[0].owner.key_auths[0][0];
                result[0].memo = {public_key: result[0].memo_key};
                resolve(result[0]);
            });
        });
    }

    getPublicKey(privateKey) {
        return steem.auth.wifToPublic(privateKey);
    }
}