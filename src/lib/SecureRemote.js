import {
    ipcRenderer,
} from 'electron';
import sha256 from "crypto-js/sha256.js";
import * as secp from "@noble/secp256k1";

class proover {
    constructor() {
        this.regen();
    }

    async regen() {
        this.key = secp.utils.randomPrivateKey();

        let pubk;
        try {
          pubk = await secp.getPublicKey(this.key);
        } catch (error) {
          console.error(error);
          return;
        }

        let encodedPubK = secp.utils.bytesToHex(secret);
        ipcRenderer.send('key', encodedPubK);
    }

    sign(data) {
        let msgHash;
        try {
          msgHash = sha256(data).toString();
        } catch (error) {
          console.log(error);
          return;
        }

        return sign(msgHash, this.key, {der: true})
    }
}

const proof = new proover();

export const getKey = (enc_key) => {
    return new Promise(resolve => {
        ipcRenderer.removeAllListeners('decrypt');
        ipcRenderer.once('decrypt', (event, arg) => {
            resolve(arg);
        });
        ipcRenderer.send('decrypt', {
            data: enc_key,
            sig: proof.sign('decrypt')
        })
    })
}
export const getBackup = (data) => {
    return new Promise(resolve => {
        ipcRenderer.removeAllListeners('backup');
        ipcRenderer.once('backup', (event, arg) => {
            resolve(arg);
        });
        ipcRenderer.send('backup', {
            data: data,
            sig: proof.sign('backup')
        })
    })
}
