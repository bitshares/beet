<script setup>
    import { ref, inject } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { QrcodeCapture } from 'qrcode-reader-vue3'

    const emitter = inject('emitter');
    const { t } = useI18n({ useScope: 'global' });
    let selected = ref();

    function onDecode (result) {
      emitter.emit('detectedQR', result);
    }

    function uploadAnother () {
        qrContent.value = null;
        selected.value = null;
    }
</script>

<template>
        <span v-if="qrContent">
            <p>
                QR detected in upload
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
