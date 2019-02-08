import SteemBasedChain from "./SteemBasedChain";

import smokejs from "@smokenetwork/smoke-js";
import Signature from "@smokenetwork/smoke-js/lib/auth/ecc/src/signature";
import KeyPrivate from "@smokenetwork/smoke-js/lib/auth/ecc/src/key_private";
import PublicKey from "@smokenetwork/smoke-js/lib/auth/ecc/src/key_public";

export default class SmokeNetwork extends SteemBasedChain {

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
        return smokejs;
    }

}