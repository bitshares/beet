import {
    PrivateKey,
    PublicKey,
    Aes
} from "bitsharesjs";
import {
    decompress
} from "lzma";
import {
    Apis
} from "bitsharesjs-ws";

import getBlockchainAPI from "../blockchainFactory";
import store from '../../../store/index.js';

class BTSWalletHandler {

    constructor(backup) {
        this.wallet_buffer = Buffer.from(backup, "binary");
    }
    unlock(wallet_pass) {
        try {
            this.wallet_pass = wallet_pass;
            let private_key = PrivateKey.fromSeed(this.wallet_pass);
            let public_key = PublicKey.fromBuffer(this.wallet_buffer.slice(0, 33));
            this.wallet_buffer = this.wallet_buffer.slice(33);
            this.wallet_buffer = Aes.decrypt_with_checksum(
                private_key,
                public_key,
                null /*nonce*/ ,
                this.wallet_buffer
            );
            let wallet_string = decompress(this.wallet_buffer);
            this.wallet_object = JSON.parse(wallet_string);
            let password_aes = Aes.fromSeed(this.wallet_pass);
            let encryption_plainbuffer = password_aes.decryptHexToBuffer(
                this.wallet_object.wallet[0].encryption_key
            );
            this.aes_private = Aes.fromSeed(encryption_plainbuffer);
            this.keypairs = [];
            for (let i = 0; i < this.wallet_object.private_keys.length; i++) {
                let private_key_hex = this.aes_private.decryptHex(
                    this.wallet_object.private_keys[i].encrypted_key
                );
                let pkey = PrivateKey.fromBuffer(Buffer.from(private_key_hex, "hex"));
                let keypair = {
                    'priv': pkey.toWif(),
                    'pub': this.wallet_object.private_keys[i].pubkey
                };
                this.keypairs.push(keypair);
            }
            this.public = [];
            this.keypairs.forEach(keypair => {
                this.public.push(keypair.pub);
            });
            return true;
        } catch (e) {
            throw new Error('Could not decrypt wallet');
        }
    }

    async lookupAccounts() {

        let blockchain = getBlockchainAPI('BTS');
        await blockchain.ensureConnection().then((connectedNode) => {
            store.dispatch("SettingsStore/setNode", {
                chain: 'BTS',
                node: connectedNode
            });
        });
        let account_ids = await Apis.instance()
            .db_api()
            .exec("get_key_references", [this.public])
            .then(res => {
                return res;
            });
        this.accounts = new Set();
        for (let i = 0; i < account_ids.length; i++) {
            for (let j = 0; j < account_ids[i].length; j++) {
                this.accounts.add(account_ids[i][j]);
            }
        }
        let refs = [];
        this.accounts.forEach((account) => {
            refs.push(
                Apis.instance()
                .db_api()
                .exec("get_account_references", [account])
                .then(res => {
                    if (res.length > 0) {
                        res.forEach((ref) => {
                            this.accounts.add(ref);
                        })
                    }
                })
            );
        });
        await Promise.all(refs);
        let accounts = Array.from(this.accounts);
        let account_matrix = await Apis.instance()
            .db_api()
            .exec("get_accounts", [accounts])
            .then(res => {
                return this.buildMatrix(res);
            });
        return account_matrix;
    }
    buildMatrix(account_data) {
        let account_matrix = [];
        let active_controlled_accounts = [];
        let owner_controlled_accounts = [];
        for (let i = 0; i < account_data.length; i++) {
            let account_details = {
                'id': account_data[i].id,
                'name': account_data[i].name
            };
            let active = {};
            let importable = false;
            //Check active
            active.availWeight = 0;
            active.canPropose = false;
            for (let j = 0; j < account_data[i].active.key_auths.length; j++) {
                if (this.public.includes(account_data[i].active.key_auths[j][0])) {
                    active.canPropose = true;
                    active.availWeight = active.availWeight + account_data[i].active.key_auths[j][1];
                    if (account_data[i].active.key_auths[j][1] >= account_data[i].active.weight_threshold) {
                        importable = true;
                        active.key = this.keypairs.filter(x => x.pub == account_data[i].active.key_auths[j][0])[0].priv;
                    }
                }
            }
            if (active.availWeight >= account_data[i].active.weight_threshold) {
                active.canTransact = true;
                active_controlled_accounts.push(account_data[i].id);
            } else {
                active.canTransact = false;
            }
            account_details.active = active;

            let owner = {}
            //Check owner
            owner.availWeight = 0;
            owner.canPropose = false;
            for (let j = 0; j < account_data[i].owner.key_auths.length; j++) {
                if (this.public.includes(account_data[i].owner.key_auths[j][0])) {
                    owner.canPropose = true;
                    owner.availWeight = owner.availWeight + account_data[i].owner.key_auths[j][1];
                    if (account_data[i].owner.key_auths[j][1] >= account_data[i].owner.weight_threshold) {
                        owner.key = this.keypairs.filter(x => x.pub == account_data[i].owner.key_auths[j][0])[0].priv;
                    }
                }
            }
            if (owner.availWeight >= account_data[i].owner.weight_threshold) {
                owner.canTransact = true;
                owner_controlled_accounts.push(account_data[i].id);
            } else {
                owner.canTransact = false;
            }
            account_details.owner = owner;

            let memo = {};
            memo.canSend = false;
            if (this.public.includes(account_data[i].options.memo_key)) {
                memo.key = this.keypairs.filter(x => x.pub == account_data[i].options.memo_key)[0].priv;
                memo.canSend = true;
            }
            account_details.importable = importable;
            account_details.memo = memo;
            account_matrix[i] = account_details;
        }
        return account_matrix;
    }
}
export default BTSWalletHandler;
