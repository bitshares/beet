import SteemBasedChain from "./SteemBasedChain";

import hive from "@hiveio/hive-js";
import Signature from "@hiveio/hive-js/lib/auth/ecc/src/signature";
import KeyPrivate from "@hiveio/hive-js/lib/auth/ecc/src/key_private";
import PublicKey from "@hiveio/hive-js/lib/auth/ecc/src/key_public";

export default class Steem extends SteemBasedChain {

    /**
     * Replacing the base getBalances function
     * @param {String} accountName 
     * @returns {Array} balances
     */
    getBalances(accountName) {
        return new Promise((resolve, reject) => {
            this.ensureConnection().then(() => {
                this.getAccount(accountName).then((account) => {
                    let balances = [];
                    balances.push({
                        asset_type: "Core",
                        asset_name: this._getCoreSymbol(),
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
                        asset_name: "HBD",
                        balance: parseFloat(account.hbd_balance),
                        owner: "-",
                        prefix: ""
                    });
                    balances.push({
                        asset_type: "UIA",
                        asset_name: "HP",
                        balance: parseFloat(account.reward_vesting_hive),
                        owner: "-",
                        prefix: ""
                    });
                    resolve(balances);
                });
            }).catch(reject);
        });
    }

    _getSignature() {
        return Signature;
    }

    _getPrivateKey() {
        return KeyPrivate;
    }

    _getPublicKey() {
        return PublicKey;
    }

    _getLibrary() {
        return hive;
    }

    getExplorer(object) {
        if (object.accountName) {
            return "https://hiveblockexplorer.com/@" + object.accountName;
        } else if (object.txid) {
            return "https://hiveblockexplorer.com/tx/" + object.txid;
        } else {
            return false;
        }
    }

}
