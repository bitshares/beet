import SteemBasedChain from "./SteemBasedChain";

import steem from "steem";
import Signature from "steem/lib/auth/ecc/src/signature";
import KeyPrivate from "steem/lib/auth/ecc/src/key_private";
import PublicKey from "steem/lib/auth/ecc/src/key_public";

export default class Steem extends SteemBasedChain {

    // https://github.com/steemit/steem-js/tree/master/doc#broadcast-api

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
        return steem;
    }

    getExplorer(object) {
        if (object.accountName) {
            return "https://steemblockexplorer.com/@" + object.accountName;
        } else if (object.txid) {
            // d52a49b9c5a76f95f32099bf387390e78ad02a65
            return "https://steemblockexplorer.com/tx/" + object.txid;
        } else {
            return false;
        }
    }

}
