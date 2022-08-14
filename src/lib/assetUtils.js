const lookupPrecision = {
    "BTC": 8,
    "BNB": 8,
    "BTS": 5
};

export function humanReadableFloat(satoshis, precision) {
    return satoshis / Math.pow(10, precision)
}

export function formatAsset(satoshis, symbol, precision = null, addSymbol = true) {
    if (precision == null) {
        precision = lookupPrecision[symbol];
    }
    if (!addSymbol) {
        symbol = "";
    } else {
        symbol = " " + symbol;
    }
    if (!precision) {
        return satoshis + "sat of" + symbol;
    } else {
        return humanReadableFloat(satoshis, precision).toFixed(precision) + symbol;
    }
}
