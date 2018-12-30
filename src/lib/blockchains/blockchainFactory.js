import { blockchains } from "../../config/config.js";

let apiCache = {}

import BitShares from "./BitShares"

export default function getBlockchainAPI(chain) {
    if (chain == "BTS") {
        if (!apiCache.BTS) {
            apiCache.BTS = new BitShares(blockchains[chain]);
        }
        return apiCache.BTS;
    }
}