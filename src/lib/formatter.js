import { blockchains } from "../config/config";

export function formatAccount(account, withTooltip=false) {
    let accountString = account.accountName;
    let displayString = account.accountName;
    if (accountString.length > 20) {
        displayString = displayString.substring(0, 20) + "...";
    }
    if (account.accountName != account.accountID) {
        accountString = accountString + " (" + account.accountID + ")";
        displayString = displayString + " (" + account.accountID + ")";
    }
    if (withTooltip) {
        return `<span v-tooltip="${accountString}">${displayString}</span>`;
    } else {
        return displayString;
    }

}

export function formatChain(chain) {
    if (!blockchains[chain]) {
        return "Unknown blockchain";
    } else {
        return blockchains[chain].name + (blockchains[chain].testnet ? " (Testnet)" : "");
    }
}
