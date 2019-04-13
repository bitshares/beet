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

    _getCoreToken() {
        return "STEEM";
    }

    getExplorer(account) {
        return "https://steemblockexplorer.com/@" + account.accountName;
    }

}
