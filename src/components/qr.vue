<script setup>
    import { onMounted, watchEffect, watch, ref, computed } from 'vue';
    import { useI18n } from 'vue-i18n';

    import { ipcRenderer } from "electron";
    import store from '../store/index';

    import {
        injectedCall,
        voteFor,
        transfer
    } from '../lib/apiUtils.js';

    import QRDrag from "./qrDrag";
    import QRScan from "./qrScan";
    import QRUpload from "./qrUpload";

    const { t } = useI18n({ useScope: 'global' });
    let qrInProgress = ref(false);
    let qrChoice = ref();

    function goBack() {
        qrInProgress.value = false;
        qrChoice.value = null;
    }

    function setChoice(choice) {
        qrChoice.value = choice;
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
            <span v-else-if="qrChoice && qrChoice === 'Scan'">
                <QRScan />
            </span>
            <span v-else-if="qrChoice && qrChoice === 'Drag'">
                <QRDrag />
            </span>
            <span v-else-if="qrChoice && qrChoice === 'Upload'">
                <QRUpload />
            </span>
            <span v-else>
                <p style="marginBottom:0px;">
                    {{ t('common.qr.main.title') }}
                </p>
                <br/>
                <ui-button raised style="margin-bottom: 10px;" @click="setChoice('Scan')">
                    {{ t('common.qr.main.scan') }}
                </ui-button>
                <br/>
                <ui-button raised style="margin-bottom: 10px;" @click="setChoice('Drag')">
                    {{ t('common.qr.main.drag') }}
                </ui-button>
                <br/>
                <ui-button raised style="margin-bottom: 10px;" @click="setChoice('Upload')">
                    {{ t('common.qr.main.upload') }}
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