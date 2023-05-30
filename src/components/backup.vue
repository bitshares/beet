<script setup>
    import { useI18n } from 'vue-i18n';
    import { ipcRenderer } from "electron";
    import store from '../store/index';

    const { t } = useI18n({ useScope: 'global' });

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
</script>

<template>
    <div
        class="dapp-list mt-2"
        style="text-align: center; margin-top: auto; margin-bottom: auto;"
    >
        <p>
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
                    raised
                    @click="downloadBackup"
                >
                    {{ t('common.backup_btn') }}
                </ui-button><br>
                <router-link
                    :to="'/dashboard'"
                    style="text-decoration: none;"
                    replace
                >
                    <ui-button
                        outlined
                        class="step_btn"
                    >
                        Exit settings menu
                    </ui-button>
                </router-link>
            </ui-grid-cell>
            <ui-grid-cell columns="3" />
        </ui-grid>
    </div>
</template>
