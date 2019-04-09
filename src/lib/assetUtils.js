export function humanReadableFloat(satoshis, precision) {
    return satoshis / Math.pow(10, precision)
}