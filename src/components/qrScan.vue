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

    let isValidQR = ref();
    let camera = ref('auto')
    let QRresult = ref()

    function goBack() {
        qrInProgress.value = false;
        qrChoice.value = null;
    }

    let validationPending = computed(() => {
        return isValidQR.value === undefined && camera.value === 'off';
    });

    let validationSuccess = computed(() => {
        return isValidQR.value === true;
    });

    let validationFailure = computed(() => {
        return isValidQR.value === false;
    });

    function resetValidationState () {
      isValidQR.value = undefined;
    }

    function onInit (promise) {
      promise
        .catch(console.error)
        .then(() => {
            resetValidationState()
        })
    }

    function turnCameraOn () {
      camera.value = 'auto';
    }

    function turnCameraOff () {
      camera.value = 'off';
    }

    function timeout (ms) {
      return new Promise(resolve => {
        window.setTimeout(resolve, ms)
      })
    }

    async function onDecode (content) {
      result.value = content
      turnCameraOff()

      // pretend it's taking really long
      await timeout(3000)
      isValidQR.value = content.startsWith('http')

      // some more delay, so users have time to read the message
      await timeout(2000)

      turnCameraOn()
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
                    {{ t('common.qr.scan.title') }}
                </p>

                <p class="decode-result" v-if="QRresult">
                    Last result: <b>{{ QRresult }}</b>
                </p>

                <qrcode-stream :camera="camera" @decode="onDecode" @init="onInit">
                <div v-if="validationSuccess" class="validation-success">
                    This is a URL
                </div>

                <div v-if="validationFailure" class="validation-failure">
                    This is NOT a URL!
                </div>

                <div v-if="validationPending" class="validation-pending">
                    Long validation in progress...
                </div>
                </qrcode-stream>

                <ui-button @click="goBack()">
                    {{ t('common.qr.back') }}
                </ui-button>
            </span>
        </span>
    </div>
</template>
