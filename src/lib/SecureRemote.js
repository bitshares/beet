import {
    ipcRenderer,
} from 'electron';
import { ec as EC } from "elliptic";
import CryptoJS from 'crypto-js';
const ec = new EC('secp256k1');

class proover {
    constructor() {
        this.regen();
    }

    async regen() {
        this.key = ec.genKeyPair();
        let publicKey = this.key.getPublic().encode('hex');
        ipcRenderer.send('key', publicKey);
    }

    sign(data) {
        return this.key.sign(CryptoJS.SHA256(data).toString()).toDER();
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