<script setup>
    import { onMounted, watchEffect, watch, ref, computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { ipcRenderer } from "electron";
    import store from '../store/index';
    import RendererLogger from "../lib/RendererLogger";
    import {formatAccount} from "../lib/formatter";

    const { t } = useI18n({ useScope: 'global' });
    const logger = new RendererLogger();
    let tableData = ref();

    onMounted(() => {
        logger.debug("Settings Mounted");
    });

    function fetchDapps() {
        let storedDapps = [];
        for (let i = 0; i < store.state.AccountStore.accountlist.length; i++) {
            let apps = store.getters['OriginStore/walletAccessibleDapps'](store.state.AccountStore.accountlist[i].accountID, store.state.AccountStore.accountlist[i].chain);
            if (typeof apps != 'undefined') {
                storedDapps = storedDapps.concat(apps);
            }
        }
        return storedDapps;
    }

    let dapps = computed(() => {
        let storedDapps = [];
        for (let i = 0; i < store.state.AccountStore.accountlist.length; i++) {
            let apps = store.getters['OriginStore/walletAccessibleDapps'](store.state.AccountStore.accountlist[i].accountID, store.state.AccountStore.accountlist[i].chain);
            if (typeof apps != 'undefined') {
                storedDapps = storedDapps.concat(apps);
            }
        }
        return storedDapps;
    })

    function getDisplayString(accountID, chain) {
        let account = store.getters['AccountStore/getSafeAccount']({account_id: accountID, chain: chain});
        return formatAccount(account);
    }

    watchEffect(() => {
        if (dapps.value && dapps.value.length) {
            tableData.value = {
                data: dapps.value.map(dapp => {
                    return {
                        appName: dapp.appName,
                        origin: dapp.origin,
                        displayString: getDisplayString(dapp.account_id, dapp.chain),
                        chain: dapp.chain,
                        actions: dapp.id
                    }
                }),
                thead: [
                    t('common.appname_lbl'),
                    t('common.origin_lbl'),
                    t('common.account_lbl'),
                    t('common.chain_lbl'),
                    t('common.actions_lbl')
                ],
                tbody: ['appName', 'origin', 'displayString', 'chain', {slot: 'actions'}]
            };
        }
    });

    async function downloadBackup() {
        let walletName = store.getters['WalletStore/getWalletName'];
        let accounts = JSON.stringify(store.getters['AccountStore/getAccountList'].slice());

        ipcRenderer.send(
            "downloadBackup",
            {
                walletName: walletName,
                accounts: accounts
            }
        );
    }

    async function deleteDapp(dapp_id) {
        await store.dispatch('OriginStore/removeApp', dapp_id);
        dapps.value = fetchDapps();
    }
</script>

<template>
    <div class="bottom p-0">
        <div class="content">
            <div class="settings mt-3">
                <p class="mb-1 font-weight-bold">
                    {{ t('common.settings_lbl') }}
                </p>
            </div>
            <div class="dapp-list mt-2">
                <p class="mb-2 font-weight-bold small">
                    <u>{{ t('common.dapps_lbl') }}</u>
                </p>
                <span v-if="tableData">
                    <ui-table
                        :data="tableData.data"
                        :thead="tableData.thead"
                        :tbody="tableData.tbody"
                        style="height: 180px; overflow-y: scroll;"
                    >
                        <template #actions="{ data }">
                            <ui-button
                                raised
                                @click="deleteDapp(data.actions)"
                            >
                                {{ t('common.delete_btn') }}
                            </ui-button>
                        </template>
                    </ui-table>
                </span>
                <span v-else>
                    <em>{{ t('common.no_dapps_linked') }}</em>
                </span>
            </div>
            <div class="backup mt-2 mb-4">
                <p class="mb-2 font-weight-bold small">
                    <u>{{ t('common.backup_lbl') }}</u>
                </p>
                <ui-grid class="row px-4">
                    <ui-grid-cell
                        class="largeHeader"
                        columns="12"
                    >
                        <p class="small text-justify">
                            {{ t('common.backup_txt') }}
                        </p>
                    </ui-grid-cell>
                    <ui-grid-cell columns="3" />
                    <ui-grid-cell columns="6">
                        <ui-button
                            class="step_btn"
                            type="button"
                            outlined
                            @click="downloadBackup"
                        >
                            {{ t('common.backup_btn') }}
                        </ui-button>
                    </ui-grid-cell>
                    <ui-grid-cell columns="3" />
                </ui-grid>
            </div>
        </div>
        <router-link
            :to="'/dashboard'"
            replace
        >
            <ui-button
                outlined
                class="step_btn"
            >
                {{ t('common.settings.exit') }}
            </ui-button>
        </router-link>
    </div>
</template>
