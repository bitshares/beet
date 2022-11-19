<script setup>
    import { ref, onMounted, computed, watchEffect } from 'vue';
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import aes from "crypto-js/aes.js";
    import ENC from 'crypto-js/enc-utf8.js';
    import fs from 'fs';
    import path from 'path';
    import sha512 from "crypto-js/sha512.js";

    import store from '../store/index';
    import router from '../router/index.js';
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    let backupPass = ref("");
    let fileError = ref(false);
    let passError = ref(false);
    let legacy = ref(false);

    let walletlist = computed(() => {
        return store.getters['WalletStore/getWalletList'];
    })

    onMounted(() => {
        logger.debug("Restore wizard Mounted");
    });

    watchEffect(async () => {
        if (fileError.value === false) {
            document.getElementById('restoreWallet').classList.remove("error");
        } else {
            document.getElementById('restoreWallet').classList.add("error");
        }
    });

    watchEffect(async () => {
        if (passError.value === false) {
            document.getElementById('backupPass').classList.remove("error");
        } else {
            document.getElementById('backupPass').classList.add("error");
        }
    });

    function restore() {
        fileError.value = false;
        passError.value = false;

        if (!document.getElementById('restoreWallet').files[0]) {
            fileError.value = true;
            return;
        }

        if (backupPass.value === "") {
            passError.value = true;
            return;
        }

        let file = document.getElementById('restoreWallet').files[0].path;

        fs.readFile(file, 'utf-8', async (err, data) => {
            if (err) {
                alert("An error ocurred reading the file :" + err.message);
                return;
            }

            let decryptedData;
            try {
                decryptedData = await aes.decrypt(
                    data,
                    legacy.value
                        ? backupPass.value
                        : sha512(backupPass.value).toString()
                );
            } catch (error) {
                console.log(error);
                fileError.value = true;
                passError.value = true;
                store.dispatch(
                    "WalletStore/notifyUser",
                    {notify: "request", message: t('common.apiUtils.restore.decryptError')}
                );
                return;
            }

            if (!decryptedData) {
                console.log("Wallet restore failed");
                fileError.value = true;
                passError.value = true;
                return;
            }

            let parsedData;
            try {
                parsedData = JSON.parse(decryptedData.toString(ENC));
            } catch (error) {
                console.log(`Invalid recovered wallet password: ${error}`);
                passError.value = true;
                store.dispatch(
                    "WalletStore/notifyUser",
                    {notify: "request", message: t('common.apiUtils.restore.invalidPassword')}
                );
                return;
            }

            let existingWalletNames = walletlist.value.slice().map(wallet => wallet.name);
            if (existingWalletNames.includes(parsedData.wallet)) {
                fileError.value = true;
                passError.value = true;
                console.log("A wallet with the same name already exists, aborting wallet restoration");
                store.dispatch(
                    "WalletStore/notifyUser",
                    {notify: "request", message: t('common.apiUtils.restore.duplicate')}
                );
                return;
            }

            try {
                await store.dispatch(
                    'WalletStore/restoreWallet',
                    {
                        backup: parsedData,
                        password: backupPass.value
                    }
                );
                router.replace("/");
            } catch (error) {
                console.log(error);
                return;
            }
        });
    }
</script>

<template>
    <div class="bottom p-0">
        <div class="content px-3">
            <h4 class="h4 mt-3 font-weight-bold">
                {{ t('common.restore_lbl') }}
            </h4>
            <p
                v-tooltip="t('common.tooltip_backupfile_cta')"
                class="my-3 font-weight-bold"
            >
                {{ t('common.backupfile_cta') }} &#10068;
            </p>
            <input
                id="restoreWallet"
                type="file"
                class="form-control mb-3"
                :placeholder="t('common.backup_placeholder')"
                required
            >
            <p
                v-tooltip="t('common.tooltip_backuppass_cta')"
                class="my-3 font-weight-bold"
            >
                {{ t('common.backuppass_cta') }} &#10068;
            </p>
            <input
                id="backupPass"
                v-model="backupPass"
                type="password"
                class="form-control mb-3"
                :placeholder="t('common.password_placeholder')"
                required
            >
            <ui-form-field>
                <ui-checkbox v-model="legacy" />
                <label>Legacy account restoration</label>
            </ui-form-field>
            <ui-grid>
                <ui-grid-cell columns="12">
                    <router-link
                        to="/"
                        replace
                    >
                        <ui-button
                            outlined
                            class="step_btn"
                        >
                            {{ t('common.cancel_btn') }}
                        </ui-button>
                    </router-link>
                    <ui-button
                        raised
                        class="step_btn"
                        type="submit"
                        @click="restore"
                    >
                        {{ t('common.restore_go_cta') }}
                    </ui-button>
                </ui-grid-cell>
            </ui-grid>
        </div>
    </div>
</template>
