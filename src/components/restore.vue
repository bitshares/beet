<script setup>
    import { ref, onMounted } from 'vue';
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import aes from "crypto-js/aes.js";
    import ENC from 'crypto-js/enc-utf8.js';
    import fs from 'fs';
    import path from 'path';

    import store from '../store/index';
    import router from '../router/index.js';
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    let backupPass = ref("");

    onMounted(() => {
      logger.debug("Restore wizard Mounted");
    });

    function restore() {
        document.getElementById('restoreWallet').classList.remove("error");
        document.getElementById('backupPass').classList.remove("error");

        if (!document.getElementById('restoreWallet').files[0]) {
          document.getElementById('restoreWallet').classList.add("error");
          return;
        }

        if (backupPass.value === "") {
          document.getElementById('backupPass').classList.add("error");
          return;
        }

        let file = document.getElementById('restoreWallet').files[0].path;

        this.emitter.emit("popup", "load-start");
        fs.readFile(file, 'utf-8', async (err, data) => {
            if (err) {
                alert("An error ocurred reading the file :" + err.message);
                this.emitter.emit("popup", "load-end");
                return;
            }
            try {
                let wallet=JSON.parse(aes.decrypt(data, backupPass.value).toString(ENC));
                await store.dispatch('WalletStore/restoreWallet', { backup: wallet, password: backupPass.value});
                this.emitter.emit("popup", "load-end");
                router.replace("/");
            } catch(e) {
                //Wrong  Password
                this.emitter.emit("popup", "load-end");
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
            <ui-grid class="container-fluid">
              <ui-grid-cell class="largeHeader" columns="6">
                <router-link to="/" replace>
                  <ui-button outlined>
                    {{ t('common.cancel_btn') }}
                  </ui-button>
                </router-link>
              </ui-grid-cell>
              <ui-grid-cell class="largeHeader" columns="6">
                <ui-button outlined @click="restore">
                    {{ t('common.restore_go_cta') }}
                </ui-button>
              </ui-grid-cell>
            </ui-grid>
        </div>
    </div>
</template>
