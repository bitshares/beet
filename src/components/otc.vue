<script setup>
    import { onMounted, watchEffect, watch, ref, computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { ipcRenderer } from "electron";
    import { v4 as uuidv4 } from 'uuid';
    import sha512 from "crypto-js/sha512.js";
    import store from '../store/index';
    import getBlockchainAPI from "../lib/blockchains/blockchainFactory";

    const { t } = useI18n({ useScope: 'global' });
    let timestamp = ref();

    let newCodeRequested = ref(false);
    function requestCode() {
        newCodeRequested.value = true;
        timestamp.value = new Date();
    }

    let id = ref();
    let thead = ref(['ID', 'Method', 'Info'])

    let tbody = ref([
        {
          field: 'id',
          fn: data => {
            return data.id
          }
        },
        {
          field: 'method',
          fn: data => {
            return t(`operations.injected.BTS.${data.method}.method`)
          }
        },
        {
          field: 'info',
          fn: data => {
            return t(`operations.injected.BTS.${data.method}.tooltip`)
          }
        }
    ]);

    let selectedRows = ref([]);

    watchEffect(() => {
        if (selectedRows.value.length) {
            console.log(JSON.stringify(selectedRows.value))
        }
    });

    let data = computed(() => {
        // get operations
        let chain = store.getters['AccountStore/getChain'];
        let types = getBlockchainAPI(chain).getOperationTypes();
        return types;
    });
    
    let progress = ref(0);
    watchEffect(() => {
        setInterval(
            () => {
                if (!timestamp.value) {
                    return;
                } else if (progress.value >= 45) {
                    progress.value = 0;
                    newCodeRequested.value = false;
                    timestamp.value = null;
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
            if (!request) {
                return;
            }

            let chain = store.getters['AccountStore/getChain'];
            if (!chain === request.payload.chain) {
                console.log("Invalid deeplink prompt");
                return;
            }

            let blockchain;
            try {
                blockchain = getBlockchainAPI(chain);
            } catch (error) {
                console.log(error);
                return;
            }

            if (!blockchain) {
                console.log('no blockchain')
                return;
            }

            // injected call || beet op

            let tr = blockchain._parseTransactionBuilder(request.payload.params);
            let authorizedUse = true;
            for (let i = 0; i < tr.operations.length; i++) {
                let operation = tr.operations[i];
                if (!selectedRows.includes(operation[0])) {
                    authorizedUse = false;
                    break;
                }
            }

            if (!authorizedUse) {
                console.log('Unauthorized use of deeplink');
                return;
            }

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
        <span>
            <p style="marginBottom:0px;">
                {{ t('common.otc_lbl') }}<br/>
                Select your required operations below
            </p>

            <ui-card outlined style="marginTop: 5px;">
                <ui-table
                    v-model="selectedRows"
                    fullwidth
                    :data="data"
                    :thead="thead"
                    :tbody="tbody"
                    :default-col-width="200"
                    style="height: 250px;"
                    row-checkbox
                    selected-key="id"
                >
                    <template #method="{ data }">
                        <div class="method">{{ data.method }}</div>
                    </template>

                    <template #info="{ data }">
                        <div class="info">{{ data.info }}</div>
                    </template>
                </ui-table>
                <ui-list>
                    <ui-item :key="chips">
                        <ui-chips id="input-chip-set" type="input" :items="list">
                            <ui-chip icon="security">
                                {{ selectedRows.length }} operations chosen
                            </ui-chip>
                            <ui-chip v-if="!newCodeRequested && selectedRows.length > 0" icon="generating_tokens" @click="requestCode">
                                Request passcode
                            </ui-chip>
                            <ui-chip v-if="!newCodeRequested && !selectedRows.length" icon="arrow_upward">
                                Insufficient operations
                            </ui-chip>
                            <ui-chip v-else-if="selectedRows.length && newCodeRequested" icon="access_time">
                                Time remaining: {{ 45 - progress.toFixed(0) }}s
                            </ui-chip>
                        </ui-chips>
                    </ui-item>
                </ui-list>
                <ui-textfield v-if="currentCode && newCodeRequested" style="margin:5px;" v-model="currentCode" outlined :attrs="{ readonly: true }">
                    <template #after>
                        <ui-textfield-icon v-copy="copyContents">content_copy</ui-textfield-icon>
                    </template>
                </ui-textfield>
            </ui-card>

            <router-link
                :to="'/dashboard'"
                replace
            >
                <ui-button
                    outlined
                    class="step_btn"
                >
                    Exit TOTP page
                </ui-button>
            </router-link>
        </span>
    </div>
</template>
