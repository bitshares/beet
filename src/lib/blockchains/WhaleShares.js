import SteemBasedChain from "./SteemBasedChain";

import wlsjs from "@whaleshares/wlsjs";
import Signature from "@whaleshares/wlsjs/lib/auth/ecc/src/signature";
import KeyPrivate from "@whaleshares/wlsjs/lib/auth/ecc/src/key_private";
import PublicKey from "@whaleshares/wlsjs/lib/auth/ecc/src/key_public";

export default class WhaleShares extends SteemBasedChain {

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

    getExplorer(object) {
        if (object.accountName) {
            return "https://whaleshares.io/whalesharesexplorer/#account/" + object.accountName;
        } else {
            return false;
        }
    }
}
