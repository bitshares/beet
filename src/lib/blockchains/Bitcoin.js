import BlockchainAPI from "./BlockchainAPI";
import RendererLogger from "../RendererLogger";
const logger = new RendererLogger();

const fetch = require('node-fetch');

import bitcoin from "bitcoinjs-lib";
import {formatAsset} from "../assetUtils";

export default class Bitcoin extends BlockchainAPI {

    // https://github.com/steemit/steem-js/tree/master/doc#broadcast-api

    _connect(nodeToConnect) {
        return new Promise((resolve, reject) => {
            if (nodeToConnect == null) {
                nodeToConnect = this.getNodes()[0].url;
            }
            this._connectionEstablished(resolve, nodeToConnect);
        });
    }

    _getAddressURL() {
        return this.getNodes()[0].url;
    }

    _getPushURL() {
        return this.getNodes()[0].push;
    }

    getAccount(accountname) {
        return new Promise((resolve, reject) => {
            this.ensureConnection().then(() => {
                fetch(this._getAddressURL() + accountname).then(result => {
                    result.json().then(result => {
                        let account = {};
                        account.active = {};
                        account.owner = {};
                        //if (!!this._lastPublicKey) {
                            account.active.public_keys = [[accountname, 1]];
                        //    if (this._publicKeyToAddress(this._lastPublicKey) !== accountname) {
                        //        reject("Public key not matching");
                        //    }
                        //} else {
                        //    reject("No public key found!");
                        //}
                        account.owner.public_keys = [];
                        account.memo = {public_key: null};
                        account.id = accountname;

                        account.raw = result;

                        resolve(account);
                    }).catch(reject);
                }).catch(reject);
            }).catch(reject);
        });
    }

    _publicKeyToAddress(publicKey) {
        let _bitcoin = bitcoin;
        let publicKeyBuffer = new Buffer(publicKey, 'hex')
        let options = {};
        if (this._config.testnet) {
            options.network = bitcoin.networks.testnet;
        }
        let keyPair = this._getKeyPairFromPublic(publicKeyBuffer);
        options.pubkey = keyPair.publicKey;
        const { address } = bitcoin.payments.p2pkh(options);
        return address;
    }

    getPublicKey(privateKey) {
        const keyPair = this._getKeyPairFromWif(privateKey);
        this._lastPublicKey = keyPair.publicKey.toString("hex");
        return keyPair.publicKey.toString("hex");
    }

    getBalances(accountName) {
        return new Promise((resolve, reject) => {
            this.getAccount(accountName).then((account) => {
                let balances = [];
                balances.push({
                    asset_type: "Core",
                    asset_name: this._getCoreSymbol(),
                    balance: formatAsset(parseFloat(account.raw.total_received - account.raw.total_sent), "BTC", null, false),
                    owner: "-",
                    prefix: ""
                });
                resolve(balances);
            });
        });
    }

    getAccessType() {
        return "address";
    }

    getSignUpInput() {
        return {
            active: true
        }
    }

    sign(operation, key) {
        return new Promise((resolve, reject) => {
            reject("Not supported yet");
        });
    }

    async broadcast(transaction) {
        if (typeof transaction == "object" && !!transaction.build) {
            let hex = transaction.build().toHex();
            let payload = null;
            if (this._config.testnet) {
                payload = {hex: hex}
            } else {
                payload = {tx: hex}
            }
            let result = await fetch(this._getPushURL(),
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }
            );
            if (result.status != 200) {
                throw result
            }
            let json = await result.json();
            if (!!json.success) {
                return json;
            } else {
                throw json;
            }
        } else {
            throw "Not supported";
        }
    }

    getOperation(data, account) {
        return new Promise((resolve, reject) => {
            reject("Not supported");
        });
    }

    mapOperationData(incoming) {
        return new Promise((resolve, reject) => {
            reject("Not supported");
        });
    }

    _signString(key, string) {
        const keyPair = this._getKeyPairFromWif(key);
        let hash = bitcoin.crypto.sha256(string);
        let signature = keyPair.sign(hash);
        return signature.toString("hex");
    }

    _getKeyPairFromWif(key) {
        let network = undefined;
        if (this._config.testnet) {
            network = bitcoin.networks.testnet;
        }
        return bitcoin.ECPair.fromWIF(key, network);
    }

    _getKeyPairFromPublic(publicKeyBuffer) {
        let options = {};
        if (this._config.testnet) {
            options.network = bitcoin.networks.testnet;
        }
        return bitcoin.ECPair.fromPublicKey(publicKeyBuffer, options);
    }

    _verifyString(signature, publicKey, string) {
        let publicKeyBuffer = new Buffer(publicKey, 'hex')
        let keyPair = this._getKeyPairFromPublic(publicKeyBuffer);
        let hash = bitcoin.crypto.sha256(string);
        return keyPair.verify(hash, new Buffer(signature, 'hex'));
    }

    _compareKeys(key1, key2) {
        return key1 === this._publicKeyToAddress(key2);
    }

    _verifyAccountAndKey(accountName, publicKey, permission = null) {
        return super._verifyAccountAndKey(accountName, this._publicKeyToAddress(publicKey), permission = null);
    }

    async transfer(key, from, to, amount, memo = null, broadcast = true) {
        let account = await this.getAccount(from);

        let unspent = [];
        account.raw.txs.forEach(_item => {
            _item.out.forEach(_tmp => {
                if (!_tmp.spent && _tmp.addr == from) {
                    _tmp.txhash = _item.hash;
                    unspent.push(_tmp);
                }
            });
        });

        let feePerByte = (await (await fetch("https://bitcoinfees.earn.com/api/v1/fees/recommended")).json()).halfHourFee;

        let network = undefined;
        if (this._config.testnet) {
            network = bitcoin.networks.testnet;
        }
        const txb = new bitcoin.TransactionBuilder(network);

        let total_input = 0;

        unspent.forEach(out => {
            if (total_input >= amount) {
                return;
            }
            txb.addInput(out.txhash, out.n);
            total_input = total_input + out.value;
        });

        if (total_input < amount.amount) {
            throw {key: "insufficient_balance"};
        }


        let total_output = amount.amount;
        txb.addOutput(to, amount.amount);

        let estimate = await this._estimateFee(txb);
        let free = total_input - amount.amount;
        if (free <= estimate.lower + (estimate.upper - estimate.lower)*2.5) {
            // no sense in adding another output, pay more fee for a quicker transaction rather than
            // getting this one stuck or creating outputs that are not worth being processed
        } else {
            let overspent = free - estimate.upper;
            txb.addOutput(from, overspent);
            total_output = total_output + overspent;
        }

        const keyPair = this._getKeyPairFromWif(key);
        unspent.forEach((item, index) => {
            txb.sign(index, keyPair);
        });

        txb.total_output = total_output;
        txb.total_input = total_input;

        let feeInSatoshis = await this._getFee(txb);

        if (!broadcast) {
            return {
                transaction: txb,
                feeInSatoshis: feeInSatoshis
            };
        } else {
            return this.broadcast(txb);
        }
    }

    async _estimateFee(transaction) {
        let feePerByte = (await (await fetch("https://bitcoinfees.earn.com/api/v1/fees/recommended")).json()).halfHourFee;
        let sizeInBytes = transaction.buildIncomplete().virtualSize();
        let countInAndOut = transaction.__tx.ins.length + transaction.__tx.outs.length;
        return {
            lower: feePerByte*sizeInBytes,
            upper: feePerByte*sizeInBytes/countInAndOut*(countInAndOut+1),
        };
    }

    async _getFee(transaction) {
        let fee = transaction.total_input - transaction.total_output;
        let estimated = await this._estimateFee(transaction).lower;
        if (fee > estimated*1.2) {
            throw "Fee is too high";
        }
        return {
            satoshis: fee,
            asset_id: "BTC"
        };
    }

    supportsFeeCalculation() {
        return true;
    }

    getExplorer(object) {
        if (object.accountName) {
            if (this._config.testnet) {
                return "https://testnet.blockexplorer.com/address/" + object.accountName
            } else {
                return "https://www.blockchain.com/btc/address/" + object.accountName
            }
        } else if (object.txid) {
            return "https://testnet.blockexplorer.com/tx/" + object.txid
        } else {
            return false;
        }
    }

    getImportOptions() {
        return [
            {
                type: "ImportAdressBased",
                translate_key: "import_address"
            }
        ];
    }

}
