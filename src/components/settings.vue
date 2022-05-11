<script setup>
    import { onMounted, computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import { ipcRenderer } from "electron";
    import store from '../store/index';
    import RendererLogger from "../lib/RendererLogger";
    import {formatAccount} from "../lib/formatter";
    import Actionbar from "./actionbar";

    const logger = new RendererLogger();

    onMounted(() => {
        logger.debug("Settings Mounted");
        //await store.dispatch("OriginStore/loadApps");
    });

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

    async function downloadBackup() {
        ipcRenderer.send(
            "downloadBackup",
            {
                walletName: store.state.WalletStore.wallet.name,
                accounts: store.state.AccountStore.accountlist.slice()
            }
        );
    }

    async function deleteDapp(dapp_id) {
        await store.dispatch('OriginStore/removeApp', dapp_id);
    }

    function getDisplayString(accountID,chain) {
        let account = store.state.AccountStore.accountlist.find(x => {
            return (x.accountID == accountID && x.chain == chain);
        });
        return formatAccount(account, true);
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
                <table>
                    <thead>
                        <tr>
                            <th class="align-middle">
                                {{ t('common.appname_lbl') }}
                            </th>
                            <th class="align-middle">
                                {{ t('common.origin_lbl') }}
                            </th>
                            <th class="align-middle">
                                {{ t('common.account_lbl') }}
                            </th>
                            <th class="align-middle">
                                {{ t('common.chain_lbl') }}
                            </th>
                            <th class="align-middle">
                                {{ t('common.actions_lbl') }}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="dapps.length==0">
                            <td
                                colspan="6"
                                class="align-center"
                            >
                                <em>{{ t('common.no_dapps_linked') }}</em>
                            </td>
                        </tr>
                        <tr
                            v-for="dapp in dapps"
                            :key="dapp.id"
                        >
                            <td class="align-middle">
                                {{ dapp.appName }}
                            </td>
                            <td class="align-middle">
                                {{ dapp.origin }}
                            </td>
                            <td
                                class="align-middle"
                                v-html="getDisplayString(dapp.account_id, dapp.chain)"
                            />
                            <td class="align-middle">
                                {{ dapp.chain }}
                            </td>
                            <td class="align-middle">
                                <button
                                    class="btn btn-sm btn-danger btn-block"
                                    type="button"
                                    @click="deleteDapp(dapp.id)"
                                >
                                    {{ t('common.delete_btn') }}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
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
                        <button
                            class="btn btn-sm btn-info btn-block"
                            type="button"
                            @click="downloadBackup"
                        >
                            {{ t('common.backup_btn') }}
                        </button>
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
                Exit settings menu
            </ui-button>
        </router-link>
    </div>
</template>
