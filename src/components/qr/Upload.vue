<script setup>
    import { ref, computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { QrcodeCapture } from 'qrcode-reader-vue3'

    import { ipcRenderer } from "electron";
    import store from '../../store/index';

    import {
        injectedCall
    } from '../../lib/apiUtils.js';

    const { t } = useI18n({ useScope: 'global' });
    let qrInProgress = ref(false);
    let qrContent = ref();
    let selected = ref();

    function onDecode (result) {
      qrInProgress.value = true;
      console.log({result})
      qrContent.value = result
      qrInProgress.value = false;
    }

    function uploadAnother () {
        qrInProgress.value = false;
        qrContent.value = null;
        selected.value = null;
    }
</script>

<template>
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
        <span v-else-if="qrContent">
            <p>
                QR detected
            </p>
            <ui-button @click="uploadAnother">
                Upload another QR
            </ui-button>
        </span>
        <span v-else>
            <p>
                {{ t('common.qr.upload.title') }}
            </p>
            <ui-card
                outlined
                v-shadow="5"
                style="height: 45px; width: 200px; margin-left: 100px; padding-top: 10px; padding-left: 5px; padding-right: 5px; border: 1px solid #C7088E;"
            >
                <qrcode-capture @decode="onDecode" :capture="selected" />
            </ui-card>
        </span>
</template>
