<script setup>
    import { onMounted, watchEffect, watch, ref, computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { QrcodeStream, QrcodeDropZone, QrcodeCapture } from 'qrcode-reader-vue3'

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
    let result = ref();
    let error = ref();
    let dragover = ref(false);

    /**
     * Dragged image QR attempt
     * @param {Promise} promise 
     */
    async function onDetect (promise) {
      try {
        const { content } = await promise

        result.value = content
        error.value = null
      } catch (error) {
        if (error.name === 'DropImageFetchError') {
          error.value = "Cross-origin images like this are unsupported.";
        } else if (error.name === 'DropImageDecodeError') {
          error.value = "Couldn't decode QR in image.";
        } else {
          error.value = 'QR detection error';
        }
      }
    }

    /**
     * @param {Boolean} isDraggingOver 
     */
    function onDragOver (isDraggingOver) {
      dragover.value = isDraggingOver;
    }

    /**
     * @param {Promise} promise 
     */
    function logErrors (promise) {
      promise.catch(console.error);
    }
</script>

<template>
    <div>
        <span v-if="qrInProgress">
            <p style="marginBottom:0px;">
                {{ t('common.totp.inProgress') }}
            </p>
            
            <ui-progress indeterminate />
        </span>
        <span v-else>
            <p>
                {{ t('common.qr.drag.title') }}
            </p>

            <ui-card
                outlined
                v-shadow="5"
                style="height: 250px; border: 1px solid #C7088E;"
            >
                <qrcode-drop-zone
                    @detect="onDetect"
                    @dragover="onDragOver"
                    @init="logErrors"
                >
                    <div
                        class="drop-area"
                        style="padding-top: 110px;"
                        :class="{ 'dragover': dragover }"
                    >
                        DROP YOUR IMAGE HERE
                    </div>
                </qrcode-drop-zone>
            </ui-card>
        </span>
    </div>
</template>
