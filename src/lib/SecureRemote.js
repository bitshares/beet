import { ipcRenderer } from 'electron';
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
        this.pubk = pubk;
    }

    async sign(data) {
        let msgHash;
        try {
          msgHash = await secp.utils.sha256(data);
        } catch (error) {
          console.log(error);
          return;
        }

        let signedMessage;
        try {
          signedMessage = await secp.sign(
            msgHash,
            this.key,
            {der: true, extraEntropy: true}
          )
        } catch (error) {
          console.log(error);
          return;
        }

        return {
          msgHash: msgHash,
          signedMessage: signedMessage,
          pubk: this.pubk
        };
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

export const getSignature = async (data) => {
  let signature;
  try {
    signature = await proof.sign(data);
  } catch (error) {
    console.log(error);
    return;
  }

  return signature;
}
