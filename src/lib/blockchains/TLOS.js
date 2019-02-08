import EOS from "./EOSmainnet";

export default class TLOS extends EOS {

    getBalances(accountName) {
        return new Promise((resolve, reject) => {
            this.getAccount(accountName).then((account) => {
                console.log(account);
                let balances = [];
                balances.push({
                    asset_type: "UIA",
                    asset_name: "TLOS",
                    balance: parseFloat(account.core_liquid_balance),
                    owner: "-",
                    prefix: ""
                });
                balances.push({
                    asset_type: "UIA",
                    asset_name: "CPU Stake",
                    balance: parseFloat(account.total_resources.cpu_weight),
                    owner: "-",
                    prefix: ""
                });
                balances.push({
                    asset_type: "UIA",
                    asset_name: "Bandwith Stake",
                    balance: parseFloat(account.total_resources.net_weight),
                    owner: "-",
                    prefix: ""
                });
                resolve(balances);
            });
        });
    }
}