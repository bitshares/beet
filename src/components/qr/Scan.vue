<script setup>
    import { onMounted, watchEffect, watch, ref, computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { QrcodeStream } from 'qrcode-reader-vue3'

    import { ipcRenderer } from "electron";
    import store from '../../store/index';

    import {
        injectedCall,
        voteFor,
        transfer
    } from '../../lib/apiUtils.js';

    const { t } = useI18n({ useScope: 'global' });
    let qrInProgress = ref(false);

    let camera = ref('auto');
    let cameraInitializing = ref(false);
    let cameraError = ref();

    let QRresult = ref();

    let videoDevices = computed(async () => {
        let enumeratedDevices = await navigator.mediaDevices.enumerateDevices();
        return enumeratedDevices.filter(device => device.kind === 'videoinput');
    });

    /**
     * Initializing the chosen camera
     * @param {Promise} promise 
     */
    function onInit (promise) {
        if (cameraError.value) {
            cameraError.value = false;
        }
        cameraInitializing.value = true;
        promise
        .catch((error) => {
            console.log(error)
            camera.value = 'off';
            cameraError.value = true;
            cameraInitializing.value = false;
        })
        .then(() => {
            cameraInitializing.value = false;
        })
    }

    /**
     * Parsing the contents of the scanned QR code
     * @param {String} content
     */
    async function onDecode (content) {
        qrInProgress.value = true;
        await timeout(1000)
        QRresult.value = content;
        camera.value = 'off';
        qrInProgress.value = false;
        console.log({content})
    }

    /**
     * Try to switch between front/back camera
     * If camera is off -> turn it on
     */
    async function switchCamera () {
      switch (camera.value) {
        case 'off':
          camera.value = 'auto'
          cameraInitializing.value = false;
          cameraError.value = undefined;
          QRresult.value = undefined;
          break
        case 'front' || 'auto':
          camera.value = 'rear'
          break
        case 'rear':
          camera.value = 'front'
          break
      }
    }

    /**
     * Overlaying branding on detected qr
     * @param {Array} detectedCodes
     * @param {Canvas} ctx
     */
    function paintQR (detectedCodes, ctx) {
      for (const detectedCode of detectedCodes) {
        const [ firstPoint, ...otherPoints ] = detectedCode.cornerPoints

        ctx.textAlign = "center"
        var img = document.getElementById("beetScan");
        ctx.drawImage(img, firstPoint.x + 25, firstPoint.y + 10);
      }

      for (const detectedCode of detectedCodes) {
        const [ firstPoint, ...otherPoints ] = detectedCode.cornerPoints

        ctx.strokeStyle = "#C7088E";

        ctx.beginPath();
        ctx.moveTo(firstPoint.x, firstPoint.y);
        for (const { x, y } of otherPoints) {
          ctx.lineTo(x, y);
        }
        ctx.lineTo(firstPoint.x, firstPoint.y);
        ctx.closePath();
        ctx.stroke();
      }
    }

    /**
     * Waiting to paint branding
     * @param {Number} ms 
     */
    function timeout (ms) {
      return new Promise(resolve => {
        window.setTimeout(resolve, ms)
      })
    }

</script>

<template>
    <div>
        <span v-if="!QRresult && camera !== 'off' && !cameraError" style="height: 250px;">
            <p>
                {{ t('common.qr.scan.title') }}
            </p>
            <ui-card
                outlined
                v-shadow="5"
                style="height: 250px; border: 1px solid #C7088E;"
            >
                <qrcode-stream
                    :camera="camera"
                    :track="paintQR"
                    @init="onInit"
                    @decode="onDecode"
                >
                    <span v-if="cameraInitializing">
                        <ui-spinner style="padding-top: 65px;" active></ui-spinner>
                    </span>

                    <div style="display:none;">
                        <img id="beetScan" src="img/beetSmall.png" />
                    </div>
                </qrcode-stream>
            </ui-card>
            <ui-button v-if="videoDevices.length > 1" @click="switchCamera">
                Switch camera
            </ui-button>
        </span>
        <span v-else>
            <span v-if="qrInProgress && camera === 'off' && !cameraError">
                <p style="marginBottom:0px;">
                    {{ t('common.qr.progress') }}
                </p>
                <br/>
                <ui-spinner active></ui-spinner>
                <br/>
            </span>
            <span v-else-if="cameraError">
                <p>
                    Your webcam failed to initialize, please try again.
                </p>
                <ui-button @click="switchCamera">
                    Try again
                </ui-button>
            </span>
            <span v-else>
                <p>
                    QR code scanned!
                </p>
                <ui-button @click="switchCamera">
                    Scan another
                </ui-button>
            </span>

        </span>
    </div>
</template>
