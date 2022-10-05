<script setup>
    import { onMounted, watchEffect, watch, ref, computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { QrcodeStream, QrcodeDropZone, QrcodeCapture } from 'vue-qrcode-reader'

    import { ipcRenderer } from "electron";
    import store from '../store/index';

    import {
        injectedCall,
        voteFor,
        transfer
    } from '../lib/apiUtils.js';

    const { t } = useI18n({ useScope: 'global' });
    let qrInProgress = ref(false);
    let qrChoice = ref();

    function goBack() {
        qrInProgress.value = false;
        qrChoice.value = null;
    }
</script>

<template>
    <div class="bottom p-0">
        <span>
            <span v-if="qrInProgress">
                <p style="marginBottom:0px;">
                    {{ t('common.totp.inProgress') }}
                </p>
                <ui-card outlined style="marginTop: 5px;">
                    <br/>
                    <ui-progress indeterminate />
                    <br/>
                </ui-card>
            </span>
            <span v-else>
                <p>
                    {{ t('common.qr.drag.title') }}
                </p>

                <ui-button @click="goBack()">
                    {{ t('common.qr.back') }}
                </ui-button>
            </span>
            <br/>
            <router-link
                :to="'/dashboard'"
                replace
            >
                <ui-button
                    outlined
                    class="step_btn"
                >
                    {{ t('common.qr.exit') }}
                </ui-button>
            </router-link>
        </span>
    </div>
</template>
