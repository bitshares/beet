import {
    ipcRenderer,
} from 'electron';
import ecc from "eosjs-ecc";
import IdGenerator from "./IdGenerator";

class proover {
    constructor() {
        this.regen();
    }

    async regen() {
        const key = await ecc.PrivateKey.fromSeed(IdGenerator.text(64));
        this.wif = key.toWif();
        ipcRenderer.send('key', key.toPublic().toString());
    }

    sign(data) {
        return ecc.sign(data, this.wif);
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