import EOSmainnet from "./EOSmainnet";

export default class BEOS extends EOSmainnet {

    getExplorer(object) {
        if (object.accountName) {
            return "https://telos.eosx.io/account/" + object.accountName;
        } else if (object.txid) {
            // 7aad190067b694b8c3a0eff68afdb4ce986cff71f497da7d90974f23e5e86be8
            return "https://telos.eosx.io/tx/" + object.txid;
        } else {
            return false;
        }
    }

}
