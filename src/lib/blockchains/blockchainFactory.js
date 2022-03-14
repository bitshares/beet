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

export default function getBlockchainAPI(chain = null) {
    if (chain == null) {
        // ask store
        chain = store.state.AccountStore.accountlist[store.state.AccountStore.selectedIndex].chain
    }

    let blockchain;
    try {
      blockchain = blockchains[chain];
    } catch (error) {
      console.log(error);
      return;
    }

    let requiredLibrary;
    if (chain == "BTS") {
        if (!bts) {
            console.log(blockchain)
            try {
              bts = new BitShares(blockchain);
            } catch (error) {
              console.log(error);
              return;
            }
        }
        return bts;
    } else if (chain == "BTS_TEST") {
        if (!bts_test) {
            try {
              bts_test = new BitShares(blockchain);
            } catch (error) {
              console.log(error);
              return;
            }
        }
        return bts_test;
    } else if (chain == "TUSC") {
        if (!tusc) {
            try {
              tusc = new TUSC(blockchain);
            } catch (error) {
              console.log(error);
              return;
            }
        }
        return tusc;
    } else if (chain == "BTC") {
        if (!btc) {
            try {
              btc = new Bitcoin(blockchain);
            } catch (error) {
              console.log(error);
              return;
            }
        }
        return btc;
    } else if (chain == "BTC_TEST") {
        if (!btc_test) {
            try {
              btc_test = new Bitcoin(blockchain);
            } catch (error) {
              console.log(error);
              return;
            }
        }
        return btc_test;
    }/* else if (chain == "STEEM" || chain == "STM") {
        if (!steem) {
            try {
              steem = new Steem(blockchain);
            } catch (error) {
              console.log(error);
              return;
            }
        }
        return steem;
    } else if (chain == "WLS") {
        if (!wls) {
            try {
              wls = new WhaleShares(blockchain);
            } catch (error) {
              console.log(error);
              return;
            }
        }
        return wls;
    } else if (chain == "EOS") {
        if (!apiCache.EOS) {
            apiCache.EOS = new EOSmainnet(blockchain);
        }
        return apiCache.EOS;
    } else if (chain == "TLOS") {
        if (!apiCache.TLOS) {
            apiCache.TLOS = new TLOS(blockchain);
        }
        return apiCache.TLOS;
    } else if (chain == "BNB") {
        if (!apiCache.BNB) {
            apiCache.BNB = new Binance(blockchain);
        }
        return apiCache.BNB;
    } else if (chain == "BNB_TEST") {
        if (!apiCache.BNB_TEST) {
            apiCache.BNB_TEST = new Binance(blockchain);
        }
        return apiCache.BNB_TEST;
    }*/

}
