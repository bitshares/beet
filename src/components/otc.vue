<script setup>
    import { onMounted, watchEffect, watch, ref, computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { ipcRenderer } from "electron";
    import { v4 as uuidv4 } from 'uuid';
    import sha512 from "crypto-js/sha512.js";

    const { t } = useI18n({ useScope: 'global' });
    let timestamp = ref();
    watchEffect(() => {
        if (!timestamp.value) {
            timestamp.value = new Date();
        }

        setInterval(
            () => {
                timestamp.value = new Date();
            },
            30000
        );
    });
    
    let progress = ref(0);
    watchEffect(() => {
        setInterval(
            () => {
                if (!timestamp.value) {
                    return;
                } else if (progress.value >= 30) {
                    progress.value = 0;
                } else {
                    let currentTimestamp = new Date();
                    var seconds = (currentTimestamp.getTime() - timestamp.value.getTime()) / 1000;
                    progress.value = seconds;
                }
            },
            1000
        );
    });

    let currentCode = ref();
    let copyContents = ref();
    watchEffect(() => {
        let msg = uuidv4();
        let shaMSG = sha512(msg + timestamp.value.getTime()).toString().substring(0, 15);
        currentCode.value = shaMSG;
        copyContents.value = {text: shaMSG, success: () => {console.log('copied code')}};
    });

    ipcRenderer.on('deeplink', (event, arg) => {
        /**
         * Deeplink
         */
        let qs = arg;
        let auth = qs.auth ?? null; // check auth
        if (auth === currentCode.value) {
            let request = arg.request ?? null
            //let shownBeetApp = store.getters['OriginStore/getBeetApp'](request);
            //let account = store.getters['AccountStore/getSafeAccount'](JSON.parse(JSON.stringify(shownBeetApp)));
            console.log("deeplink triggered")

            // prompt the user with deeplinked action request
            /*
            ipcRenderer.send(
                'createPopup',
                {
                    request: request,
                    accounts: [account]
                }
            );
            */
        }
    })
</script>

<template>
    <div class="bottom p-0">
        <div class="content">
            <div class="settings mt-3">
                <p class="mb-1 font-weight-bold">
                    {{ t('common.otc_lbl') }}
                </p>
                <ui-textfield v-if="currentCode" v-model="currentCode" outlined :attrs="{ readonly: true }">
                    <template #after>
                        <ui-textfield-icon v-copy="copyContents">content_copy</ui-textfield-icon>
                    </template>
                </ui-textfield>
                <p>
                    Time left: {{ 30 - progress.toFixed(0) }} seconds
                </p>
            </div>
        </div>
        <br/>
        <router-link
            :to="'/dashboard'"
            replace
        >
            <ui-button
                outlined
                class="step_btn"
            >
                Exit OTC page
            </ui-button>
        </router-link>
    </div>
</template>
