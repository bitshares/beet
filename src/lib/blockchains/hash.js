import createHash from "create-hash";

/** @arg {string|Buffer} data
 @arg {string} [digest = null] - 'hex', 'binary' or 'base64'
 @return {string|Buffer} - Buffer when digest is null, or string
 */
export function sha256(data, encoding) {
    return createHash("sha256").update(data).digest(encoding);
}