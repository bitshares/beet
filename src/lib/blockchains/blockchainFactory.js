import { blockchains } from "../../config/config.js";

import BitShares from "./BitShares"
import TUSC from "./TUSC"
import store from "../../store";
import Bitcoin from "./Bitcoin";

/*
import Steem from "./Steem"
import WhaleShares from "./WhaleShares";
import EOSmainnet from "./EOSmainnet";
import TLOS from "./TLOS";
import Binance from "./Binance";
*/

let storedChain;
let lastChain;

export default function getBlockchainAPI(chain = null, node = null) {
    if (chain == null) {
        chain = store.getters['AccountStore/getChain'];
    }

    if (!lastChain) {
        lastChain = chain;
    } else if (lastChain && lastChain !== chain) {
        console.log("Switching blockchain!")
        storedChain = undefined;
        lastChain = chain;
    }

    let config;
    try {
      config = blockchains[chain];
    } catch (error) {
      console.log(error);
      return;
    }

    if (!storedChain) {
        try {
            if (chain == "BTS" || chain == "BTS_TEST") {
                storedChain = new BitShares(config, node);
            } else if (chain == "TUSC") {
                storedChain = new TUSC(config, node);
            } else if (chain == "BTC" || chain == "BTC_TEST") {
                storedChain = new Bitcoin(config, node);
            }
            /*
                else if (chain == "STEEM" || chain == "STM") {
                   storedChain = new Steem(config, node);
                } else if (chain == "WLS") {
                   storedChain = new WhaleShares(config, node);
                } else if (chain == "EOS") {
                   storedChain = new EOSmainnet(config, node);
                } else if (chain == "TLOS") {
                   storedChain = new TLOS(config, node);
                } else if (chain == "BNB" || chain == "BNB_TEST") {
                   storedChain = new Binance(config, node);
                }
            */
        } catch (error) {
            console.log(error);
            return;
        }
    }

    return storedChain;
}
