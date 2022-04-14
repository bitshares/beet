<script setup>
    import {ref, onMounted, inject} from "vue";
    const emitter = inject('emitter');
    import { ipcRenderer } from 'electron';

    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import getBlockchainAPI from "../../../lib/blockchains/blockchainFactory";
    import BTSWalletHandler from "../../../lib/blockchains/bitshares/BTSWalletHandler";

    const props = defineProps({
        chain: String,
        node: String
    });

    onMounted(() => {
        if (!["BTS", "TUSC"].includes(props.chain)) {
            throw "Unsupported chain!";
        }
    })

    let accountname = ref("");
    let accountID = ref("");
    let substep1 = ref(true);
    let substep2 = ref(false);
    let wallet_file = ref(null);
    let bin_file_password = ref(null);
    let accounts = ref([]);
    let picked = ref([]);

    //let BTSImportType = ref(null); // Where is this set?

    async function step3() {
        if (accountname.value == "") {
            throw {
                key: "missing_account_error",
                args: {
                    chain: props.chain
                }
            };
        }

        let blockchain = getBlockchainAPI(props.chain);
        // abstract UI concept more
        let authorities = blockchain.getAccessType() == "account"
            ? {
                active: this.activepk,
                memo: this.memopk,
                owner: this.includeOwner == 1 ? this.ownerpk : null
            }
            : {
                active: this.activepk
            };

        let account;
        try {
            account = await blockchain.verifyAccount(accountname.value, authorities);

            /*
              if (blockchain.getAccessType() == "account" && this.BTSImportType == 2){
                  authorities = this.getAuthoritiesFromPass(this.bitshares_cloud_login_password);
                  try {
                      account = await blockchain.verifyAccount(this.accountname, authorities);
                  }catch(e)  {
                      authorities = this.getAuthoritiesFromPass(this.bitshares_cloud_login_password,true);
                      account = await blockchain.verifyAccount(this.accountname, authorities);
                      //TODO: Should notify user of legacy/dangerous permissions (active==memo)
                  }
              }
            */
        } catch (error) {
            accountID.value = "";
            ipcRenderer.send(
                "notify",
                error.key ? t(`common.${error.key}`) : error.toString()
            );
        }
        accountID.value = account.id;
    }

    function handleWalletSelect(e) {
        wallet_file.value = e.target.files[0];
    }

    async function _decryptBackup() {
        let loaderPromise = new Promise((resolve, reject) => {
            let reader = new FileReader();
            reader.onload = async evt => {
                let wh = new BTSWalletHandler(evt.target.result);
                let unlocked = await wh.unlock(bin_file_password.value);
                if (unlocked) {
                    accounts.value = await wh.lookupAccounts();
                    substep1.value = false;
                    substep2.value = true;
                    resolve(null);
                } else {
                    reject("Wallet could not be unlocked");
                }
            };
            reader.readAsBinaryString(wallet_file.value);
        });
        return await loaderPromise;
    }

    function _getPickedAccounts() {
        let toImport = accounts.value.filter(x => picked.value.includes(x.id));
        let pickedAccounts = [];
        for (let i in toImport) {
            let account = toImport[i];
            pickedAccounts.push({
                account: {
                    accountName: account.name,
                    accountID: account.id,
                    chain: props.chain,
                    keys: {
                        active: account.active.key,
                        owner: account.owner.key,
                        memo: account.memo.key
                    }
                }
            });
        }
        return accounts;
    }

    function back() {
        emitter.emit('back', true);
    }

    async function next() {
        return substep1.value ? await _decryptBackup() : _getPickedAccounts();
    }
</script>

<template>
    <div id="step2">
        <template v-if="substep1">
            <p class="mb-2 font-weight-bold">
                {{ t('common.Select your .bin backup file.') }}
            </p>
            <input
                type="file"
                class="form-control mb-3 small"
                @change="handleWalletSelect"
            >
            <p class="mb-2 font-weight-bold">
                {{ t('common.Enter your .bin file password.') }}
            </p>
            <input
                v-model="bin_file_password"
                type="password"
                class="form-control mb-3 small"
            >
            <br>
            <br>
            <ui-button
                outlined
                class="step_btn"
                @click="back"
            >
                {{ t('common.back_btn') }}
            </ui-button>
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
                                rowspan="2"
                                class="align-middle"
                            >
                                Active Authority
                            </th>
                            <th
                                rowspan="2"
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

                <ui-grid>
                    <ui-grid-cell columns="12">
                        <ui-button
                            outlined
                            class="step_btn"
                            @click="back"
                        >
                            {{ t('common.back_btn') }}
                        </ui-button>

                        <ui-button
                            raised
                            class="step_btn"
                            type="submit"
                            @click="next"
                        >
                            {{ t('common.next_btn') }}
                        </ui-button>
                    </ui-grid-cell>
                </ui-grid>
            </div>
            <!--<button-->
            <!--v-if="picked.length>10"-->
            <!--class="btn btn-lg btn-primary btn-block mt-3"-->
            <!--@click="simpleStep3"-->
            <!--&gt;-->
            <!--{{ t('common.import_btn') }}-->
            <!--</button>-->
        </template>
    </div>
</template>
