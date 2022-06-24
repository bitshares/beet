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

let bts,bts_test,tusc,steem,wls,eos,tlos,btc,btc_test,bnb,bnb_test;

export default function getBlockchainAPI(chain = null, node = null) {
    if (chain == null) {
        chain = store.getters['AccountStore/getChain'];
    }

    let config;
    try {
      config = blockchains[chain];
    } catch (error) {
      console.log(error);
      return;
    }

    if (chain == "BTS") {
        if (!bts) {
            try {
              bts = new BitShares(config, node);
            } catch (error) {
              console.log(error);
              return;
            }
        }
        return bts;
    } else if (chain == "BTS_TEST") {
        if (!bts_test) {
            try {
              bts_test = new BitShares(config, node);
            } catch (error) {
              console.log(error);
              return;
            }
        }
        return bts_test;
    } else if (chain == "TUSC") {
        if (!tusc) {
            try {
              tusc = new TUSC(config, node);
            } catch (error) {
              console.log(error);
              return;
            }
        }
        return tusc;
    } else if (chain == "BTC") {
        if (!btc) {
            try {
              btc = new Bitcoin(config, node);
            } catch (error) {
              console.log(error);
              return;
            }
        }
        return btc;
    } else if (chain == "BTC_TEST") {
        if (!btc_test) {
            try {
              btc_test = new Bitcoin(config, node);
            } catch (error) {
              console.log(error);
              return;
            }
        }
        return btc_test;
    }/* else if (chain == "STEEM" || chain == "STM") {
        if (!steem) {
            try {
              steem = new Steem(config, node);
            } catch (error) {
              console.log(error);
              return;
            }
        }
        return steem;
    } else if (chain == "WLS") {
        if (!wls) {
            try {
              wls = new WhaleShares(config, node);
            } catch (error) {
              console.log(error);
              return;
            }
        }
        return wls;
    } else if (chain == "EOS") {
        if (!apiCache.EOS) {
            apiCache.EOS = new EOSmainnet(config, node);
        }
        return apiCache.EOS;
    } else if (chain == "TLOS") {
        if (!apiCache.TLOS) {
            apiCache.TLOS = new TLOS(config, node);
        }
        return apiCache.TLOS;
    } else if (chain == "BNB") {
        if (!apiCache.BNB) {
            apiCache.BNB = new Binance(config, node);
        }
        return apiCache.BNB;
    } else if (chain == "BNB_TEST") {
        if (!apiCache.BNB_TEST) {
            apiCache.BNB_TEST = new Binance(config, node);
        }
        return apiCache.BNB_TEST;
    }*/

}
