<script setup>
    import { ref, inject } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { QrcodeCapture } from 'vue-qrcode-reader'

    const emitter = inject('emitter');
    const { t } = useI18n({ useScope: 'global' });
    let selected = ref();
    let qrContent = ref();

    function onDecode (result) {
        if (result) {
            qrContent.value = true;
            emitter.emit('detectedQR', result);
        }
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
            v-shadow="5"
            outlined
            style="height: 45px; width: 200px; margin-left: 100px; padding-top: 10px; padding-left: 5px; padding-right: 5px; border: 1px solid #C7088E;"
        >
            <qrcode-capture
                :capture="selected"
                @decode="onDecode"
            />
        </ui-card>
    </span>
</template>
