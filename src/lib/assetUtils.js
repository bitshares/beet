const lookupPrecision = {
    "BTC": 8
};

export function humanReadableFloat(satoshis, precision) {
    return satoshis / Math.pow(10, precision)
}

export function formatAsset(satoshis, symbol, precision = null) {
    if (precision == null) {
        precision = lookupPrecision[symbol];
    }
    if (!precision) {
        return satoshis + "sat of " + symbol;
    } else {
        return humanReadableFloat(satoshis, precision).toFixed(precision) + " " + symbol;
    }
}