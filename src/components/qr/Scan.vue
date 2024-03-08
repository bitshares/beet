<script setup>
    import { ref, computed, inject, onMounted } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { QrcodeStream } from 'vue-qrcode-reader'

    const { t } = useI18n({ useScope: 'global' });
    const emitter = inject('emitter');

    let camera = ref('auto');
    let cameraInitializing = ref(false);
    let cameraError = ref();
    let videoDevices = ref();

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

    let QRresult = ref();
    /**
     * Parsing the contents of the scanned QR code
     * @param {String} content
     */
    async function onDecode (content) {
        if (!QRresult.value) {
            await timeout(1000);
            QRresult.value = content;
            camera.value = 'off';
            emitter.emit('detectedQR', content);
        }
    }

    /**
     * Try to switch between front/back camera
     * If camera is off -> turn it on
     */
    async function switchCamera () {
        if (camera.value === 'off') {
            console.log('turning on camera')
            camera.value = 'auto'
            cameraInitializing.value = false;
            cameraError.value = undefined;
            QRresult.value = undefined;
        } else if (camera.value === 'auto') {
            console.log('setting to front')
            camera.value = 'front'
        } else if (camera.value === 'front') {
            console.log('setting to rear')
            camera.value = 'rear'
        } else {
            camera.value = 'front'
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

    onMounted(async () => {
        let enumeratedDevices = await navigator.mediaDevices.enumerateDevices();
        videoDevices.value = enumeratedDevices.filter(device => device.kind === 'videoinput');
    });
</script>

<template>
    <div>
        <span
            v-if="!QRresult && camera !== 'off' && !cameraError"
            style="height: 300px;"
        >
            <p>
                {{ t('common.qr.scan.title') }}
            </p>
            <div style="display: flex; justify-content: center;">
                <ui-card
                    v-shadow="5"
                    outlined
                    style="height: 300px; width: 300px; border: 1px solid #C7088E;"
                >
                    <qrcode-stream
                        :camera="camera"
                        :track="paintQR"
                        class="qrcode-stream-wrapper"
                        @init="onInit"
                        @decode="onDecode"
                    >
                        <span v-if="cameraInitializing">
                            <ui-spinner
                                style="padding-top: 65px;"
                                active
                            />
                        </span>

                        <div style="display:none;">
                            <img
                                id="beetScan"
                                src="img/beetSmall.png"
                            >
                        </div>

                        <video
                            class="qrcode-stream-camera"
                            autoplay
                            playsinline
                            object-fit="cover"
                        />
                    </qrcode-stream>
                </ui-card>
            </div>
            <ui-button
                v-if="videoDevices && videoDevices.length > 1"
                @click="switchCamera"
            >
                Switch camera
            </ui-button>
        </span>
        <span v-else>
            <span v-if="cameraError">
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

<style>
.qrcode-stream-wrapper {
    max-width: 300px;
    max-height: 300px;
    overflow: hidden;
}

.qrcode-stream-camera {
    width: 100%;
    height: 100%;
}
</style>