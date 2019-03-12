<template>
    <div
        id="step2"
    >
        <h4 class="h4 mt-3 font-weight-bold">
            {{ $t('step_counter',{ 'step_no' : 2}) }}
        </h4>
        <template v-if="substep1">
            <p
                class="mb-2 font-weight-bold"
            >
                {{ $t('Select your .bin backup file.') }}
            </p>
            <input
                type="file"
                class="form-control mb-3 small"
                @change="handleWalletSelect"
            >
            <p
                class="mb-2 font-weight-bold"
            >
                {{ $t('Enter your .bin file password.') }}
            </p>
            <input
                v-model="bin_file_password"
                type="password"
                class="form-control mb-3 small"
            >
        </template>
        <template v-if="substep2">
            <div class="import-accounts mt-3">
                <table class="table small table-striped table-sm">
                    <thead>
                    <tr>
                        <th
                                rowspan="2"
                                class="align-middle"
                        >
                            Account Name
                        </th>
                        <th
                                colspan="2"
                                class="align-middle"
                        >
                            Active Authority
                        </th>
                        <th
                                colspan="2"
                                class="align-middle"
                        >
                            Owner Authority
                        </th>
                        <th
                                rowspan="2"
                                class="align-middle"
                        >
                            Memo
                        </th>
                        <th
                                rowspan="2"
                                class="align-middle"
                        >
                            Import?
                        </th>
                    </tr>
                    <tr>
                        <th class="align-middle">
                            Propose
                        </th>
                        <th class="align-middle">
                            Transact
                        </th>
                        <th class="align-middle">
                            Propose
                        </th>
                        <th class="align-middle">
                            Transact
                        </th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr
                        v-for="account in accounts"
                        :key="account.id"
                        :class="{ disabledImport : !account.importable}"
                    >
                        <td class="text-center align-middle">
                            {{ account.name }}<br>({{ account.id }})
                        </td>
                        <td class="text-center align-middle">
                            {{ account.active.canPropose ? 'Y' : 'N' }}
                        </td>
                        <td class="text-center align-middle">
                            {{ account.active.canTransact ? 'Y' : 'N' }}
                        </td>
                        <td class="text-center align-middle">
                            {{ account.owner.canPropose ? 'Y' : 'N' }}
                        </td>
                        <td class="text-center align-middle">
                            {{ account.owner.canTransact ? 'Y' : 'N' }}
                        </td>
                        <td class="text-center align-middle">
                            {{ account.memo.canSend ? 'Y' : 'N' }}
                        </td>
                        <td class="text-center align-middle">
                            <input
                                v-if="account.importable"
                                :id="account.name"
                                v-model="picked"
                                type="checkbox"
                                :value="account.id"
                            >
                        </td>
                    </tr>
                    </tbody>
                </table>
            </div>
            <button
                v-if="picked.length>0"
                class="btn btn-lg btn-primary btn-block mt-3"
                @click="simpleStep3"
            >
                {{ $t('import_btn') }}
            </button>
        </template>
    </div>
</template>

<script>
    import getBlockchain from "../../../lib/blockchains/blockchainFactory";
    import BTSWalletHandler from "../../../lib/blockchains/bitshares/BTSWalletHandler";

    export default {
        name: "ImportBinFile",
        i18nOptions: { namespaces: "common" },
        props: [ "selectedChain" ],
        data() {
            return {
                accountname: "",
                accountID: "",
                substep1: true,
                substep2: false,
                wallet_file: null,
                bin_file_password: null,
                accounts: [],
                picked: []
            };
        },
        created() {
            if (this.selectedChain != "BTS") {
                throw "Unsupported chain!";
            }
        },
        methods: {
            step3: async function() {
                if (this.accountname == "") {
                    throw {
                        key: "missing_account_error",
                        args: {
                            chain: this.selectedChain
                        }
                    };
                }
                try {
                    let blockchain = getBlockchain(this.selectedChain);
                    // abstract UI concept more
                    let authorities = null;
                    let account = null;
                    if (blockchain.getAccessType() == "account") {
                        if (this.BTSImportType == 2){
                            authorities = this.getAuthoritiesFromPass(this.bitshares_cloud_login_password);
                            try {
                                account = await blockchain.verifyAccount(this.accountname, authorities);
                            }catch(e)  {
                                authorities = this.getAuthoritiesFromPass(this.bitshares_cloud_login_password,true);
                                account = await blockchain.verifyAccount(this.accountname, authorities);
                                //TODO: Should notify user of legacy/dangerous permissions (active==memo)
                            }
                        }else{
                            authorities = {
                                active: this.activepk,
                                memo: this.memopk,
                                owner: this.includeOwner == 1 ? this.ownerpk : null
                            };
                            account = await blockchain.verifyAccount(this.accountname, authorities);
                        }
                    } else {
                        authorities = {
                            active: this.activepk
                        };
                        account = await blockchain.verifyAccount(this.accountname, authorities);
                    }

                    EventBus.$emit("popup", "load-end");
                    this.accountID = account.id;
                } catch (err) {
                    this.accountID = "";
                    if (err.key) {
                        this.errorMsg = this.$t(err.key);
                    } else {
                        this.errorMsg = err.toString();
                    }
                    this.$refs.errorModal.show();
                } finally {
                    EventBus.$emit("popup", "load-end");
                }
            },
            handleWalletSelect: function(e) {
                this.wallet_file = e.target.files[0];
            },
            _decryptBackup: async function() {
                let loaderPromise = new Promise((resolve, reject) => {
                    let reader = new FileReader();
                    reader.onload = async evt => {
                        let wh = new BTSWalletHandler(evt.target.result);
                        let unlocked = await wh.unlock(this.bin_file_password);
                        if (unlocked) {
                            this.accounts = await wh.lookupAccounts();
                            this.substep1 = false;
                            this.substep2 = true;
                            resolve(null);
                        } else {
                            reject("Wallet could not be unlocked");
                        }
                    };
                    reader.readAsBinaryString(this.wallet_file);
                });
                return await loaderPromise;
            },
            _getPickedAccounts() {
                let toImport = this.accounts.filter(x => this.picked.includes(x.id));
                let accounts = [];
                for (let i in toImport) {
                    let account = toImport[i];
                    accounts.push({
                        account: {
                            accountName: account.name,
                            accountID: account.id,
                            chain: this.selectedChain,
                            keys: {
                                active: account.active.key,
                                owner: account.owner.key,
                                memo: account.memo.key
                            }
                        }
                    });
                }
                return accounts;
            },
            getAccountEvent: async function() {
                if (this.substep1) {
                    return await this._decryptBackup();
                } else {
                    return this._getPickedAccounts();
                }
            }
        }
    };
</script>