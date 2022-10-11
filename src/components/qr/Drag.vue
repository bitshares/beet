<script setup>
    import { onMounted, watchEffect, watch, ref, computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { QrcodeStream, QrcodeDropZone, QrcodeCapture } from 'qrcode-reader-vue3'

    import { ipcRenderer } from "electron";
    import store from '../../store/index';

    import {
        injectedCall,
        voteFor,
        transfer
    } from '../../lib/apiUtils.js';

    const { t } = useI18n({ useScope: 'global' });
    let result = ref();
    let error = ref();
    let dragover = ref(false);

    /**
     * Dragged image QR attempt
     * @param {Promise} promise 
     */
    async function onDetect (promise) {
      let content;
      try {
        content = await promise
      } catch (error) {
        if (error.name === 'DropImageFetchError') {
          error.value = "Cross-origin images like this are unsupported.";
        } else if (error.name === 'DropImageDecodeError') {
          error.value = "Couldn't decode QR in image.";
        } else {
          error.value = 'QR detection error';
        }
      }
      
      //result.value = content;
      error.value = null;
      emitter.emit('detectedQR', content);
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
      promise.catch((error) => {console.log(error)});
    }

    function tryAgain() {
      result.value = null;
      error.value = null;
    }
</script>

<template>
    <div>
        <span v-if="result && !error">
            <p>
                Successfully scanned image for QR
            </p>           
            <ui-button @click="tryAgain">
                Scan another image
            </ui-button>
        </span>
        <span v-else-if="!result && error">
            <ui-alert state="warning" closable>
                {{error}}
            </ui-alert>           
            <ui-button @click="tryAgain">
                Scan another image
            </ui-button>
        </span>
        <span v-else>
            <p>
                {{ t('common.qr.drag.title') }}
            </p>

            <ui-card
                outlined
                v-shadow="5"
                style="height: 100px; width: 200px; margin-left: 115px; border: 1px solid #C7088E;"
            >
                <qrcode-drop-zone
                    @detect="onDetect"
                    @dragover="onDragOver"
                    @init="logErrors"
                >
                    <div
                        class="drop-area"
                        style="height: 100px; width: 200px; padding-top: 40px;"
                        :class="{ 'dragover': dragover }"
                    >
                        DROP YOUR IMAGE HERE
                    </div>
                </qrcode-drop-zone>
            </ui-card>
        </span>
    </div>
</template>
