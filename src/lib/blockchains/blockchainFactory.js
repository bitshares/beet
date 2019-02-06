import { blockchains } from "../../config/config.js";

let apiCache = {}

import BitShares from "./BitShares"
import Steem from "./Steem"
import store from "../../store";
import WhaleShares from "./WhaleShares";
import SmokeNetwork from "./SmokeNetwork";

export default function getBlockchainAPI(chain = null) {
    if (chain == null) {
        // ask store
        chain = store.state.WalletStore.wallet.chain
    }
    if (chain == "BTS") {
        if (!apiCache.BTS) {
            apiCache.BTS = new BitShares(blockchains[chain]);
        }
        return apiCache.BTS;
    } else if (chain == "STEEM" || chain == "STM") {
        if (!apiCache.STEEM) {
            apiCache.STEEM = new Steem(blockchains[chain]);
        }
        return apiCache.STEEM;
    } else if (chain == "WLS") {
        if (!apiCache.WLS) {
            apiCache.WLS = new WhaleShares(blockchains[chain]);
        }
        return apiCache.WLS;
    } else if (chain == "SMOKE" || chain == "SMK") {
        if (!apiCache.SMOKE) {
            apiCache.SMOKE = new SmokeNetwork(blockchains[chain]);
        }
        return apiCache.SMOKE;
    }
}