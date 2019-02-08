import SteemBasedChain from "./SteemBasedChain";

import wlsjs from "@whaleshares/wlsjs";
import Signature from "@whaleshares/wlsjs/lib/auth/ecc/src/signature";
import KeyPrivate from "@whaleshares/wlsjs/lib/auth/ecc/src/key_private";
import PublicKey from "@whaleshares/wlsjs/lib/auth/ecc/src/key_public";

export default class WhaleShares extends SteemBasedChain {

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
        return wlsjs;
    }

}