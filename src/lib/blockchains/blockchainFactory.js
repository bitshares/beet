import { blockchains } from "../../config/config.js";

let apiCache = {}

import BitShares from "./BitShares"
import TUSC from "./TUSC"
import Steem from "./Steem"
import store from "../../store";
import WhaleShares from "./WhaleShares";
import EOSmainnet from "./EOSmainnet";
import TLOS from "./TLOS";
import Bitcoin from "./Bitcoin";
import Binance from "./Binance";

export default function getBlockchainAPI(chain = null) {
    if (chain == null) {
        // ask store
        chain = store.state.AccountStore.accountlist[store.state.AccountStore.selectedIndex].chain
    }
    if (chain == "BTS") {
        if (!apiCache.BTS) {
            apiCache.BTS = new BitShares(blockchains[chain]);
        }
        return apiCache.BTS;
    } else if (chain == "BTS_TEST") {
        if (!apiCache.BTS_TEST) {
            apiCache.BTS_TEST = new BitShares(blockchains[chain]);
        }
        return apiCache.BTS_TEST;
    } else if (chain == "TUSC") {
        if (!apiCache.TUSC) {
            apiCache.TUSC = new TUSC(blockchains[chain]);
        }
        return apiCache.TUSC;
    } else if (chain == "STEEM" || chain == "STM") {
        if (!apiCache.STEEM) {
            apiCache.STEEM = new Steem(blockchains["STEEM"]);
        }
        return apiCache.STEEM;
    } else if (chain == "WLS") {
        if (!apiCache.WLS) {
            apiCache.WLS = new WhaleShares(blockchains[chain]);
        }
        return apiCache.WLS;
    } else if (chain == "EOS") {
        if (!apiCache.EOS) {
            apiCache.EOS = new EOSmainnet(blockchains[chain]);
        }
        return apiCache.EOS;
    } else if (chain == "TLOS") {
        if (!apiCache.TLOS) {
            apiCache.TLOS = new TLOS(blockchains[chain]);
        }
        return apiCache.TLOS;
    } else if (chain == "BTC") {
        if (!apiCache.BTC) {
            apiCache.BTC = new Bitcoin(blockchains[chain]);
        }
        return apiCache.BTC;
    } else if (chain == "BTC_TEST") {
        if (!apiCache.BTC_TEST) {
            apiCache.BTC_TEST = new Bitcoin(blockchains[chain]);
        }
        return apiCache.BTC_TEST;
    } else if (chain == "BNB") {
        if (!apiCache.BNB) {
            apiCache.BNB = new Binance(blockchains[chain]);
        }
        return apiCache.BNB;
    } else if (chain == "BNB_TEST") {
        if (!apiCache.BNB_TEST) {
            apiCache.BNB_TEST = new Binance(blockchains[chain]);
        }
        return apiCache.BNB_TEST;
    }

}
