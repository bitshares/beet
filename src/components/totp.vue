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
 
    let timeLimit = ref();
    function setTime(time) {
        timeLimit.value = time;
    }

    function saveRows() {
        if (selectedRows && selectedRows.value) {
            // save rows to account
            let chain = store.getters['AccountStore/getChain']
            store.dispatch(
                "SettingsStore/setChainTOTP",
                {
                    chain: chain,
                    rows: selectedRows.value
                }
            );
            selectedRows.value = JSON.parse(JSON.stringify(settingsRows.value))
        }
    }

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
                } else if (progress.value >= timeLimit.value) {
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

    let settingsRows = computed(() => {
        // last approved TOTP rows for this chain
        let chain = store.getters['AccountStore/getChain']
        let rememberedRows = store.getters['SettingsStore/getChainTOTP'](chain);
        if (!rememberedRows || !rememberedRows.length) {
            return [];
        }

        return rememberedRows;
    });

    let hasSelectedNewRows = ref(false);
    let selectedRows = ref([]);
    onMounted(() => {
        console.log('mounted')
        selectedRows.value = settingsRows && settingsRows.value
                                ? JSON.parse(JSON.stringify(settingsRows.value))
                                : []
    })

    watchEffect(() => {
        if (selectedRows && settingsRows) {
            if (
                selectedRows.value && selectedRows.value.join('') === settingsRows.value.join('')
            ) {
                // initial setting of settingsrows
                console.log('Existing TOTP settings applied')
                hasSelectedNewRows.value = false;
            } else if (selectedRows.value && selectedRows.value.join('') !== settingsRows.value.join('')) {
                console.log('Selected a new row')
                hasSelectedNewRows.value = true;
            }
        } else {
            hasSelectedNewRows.value = false;
        }
    });

    let currentCode = ref();
    let copyContents = ref();
    watchEffect(() => {
        if (timestamp && timestamp.value) {
            let msg = uuidv4();
            let shaMSG = sha512(msg + timestamp.value.getTime()).toString().substring(0, 15);
            currentCode.value = shaMSG;
            copyContents.value = {text: shaMSG, success: () => {console.log('copied code')}};
        }
    });

    let deepLinkInProgress = ref(false);
    ipcRenderer.on('deeplink', async (event, args) => {
        /**
         * Deeplink
         */
        deepLinkInProgress.value = true;
        if (!currentCode.value) {
            console.log('No auth key')
            deepLinkInProgress.value = false;
            return;
        }

        let requestData = args.request ?? null;
        if (!requestData) {
            console.log('No request in deeplink')
            deepLinkInProgress.value = false;
            return;
        }

        let decryptedData;
        try {
            decryptedData = await aes.decrypt(requestData, currentCode.value).toString(ENC);
        } catch (error) {
            console.log(error);
            deepLinkInProgress.value = false;
            return;
        }

        let request;
        try {
            request = decodeURIComponent(decryptedData);
        } catch (error) {
            console.log(error);
            deepLinkInProgress.value = false;
            return;
        }

        if (!request) {
            console.log('invalid request format')
            deepLinkInProgress.value = false;
            return;
        }
        
        let chain = store.getters['AccountStore/getChain'];
        if (!chain === request.payload.chain) {
            console.log("Invalid deeplink prompt");
            deepLinkInProgress.value = false;
            return;
        }

        let blockchain;
        try {
            blockchain = getBlockchainAPI(chain);
        } catch (error) {
            console.log(error);
            deepLinkInProgress.value = false;
            return;
        }

        if (!blockchain) {
            console.log('no blockchain')
            deepLinkInProgress.value = false;
            return;
        }

        let type = request.type;
        if (!selectedRows.includes(type)) {
            console.log("Unauthorized beet operation")
            deepLinkInProgress.value = false;
            return;
        }

        if (type === Actions.INJECTED_CALL) {
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
                console.log(`Unauthorized use of deeplinked ${chain} blockchain operation`);              
                deepLinkInProgress.value = false;
                return;
            }
        }

        let shownBeetApp = store.getters['OriginStore/getBeetApp'](request);
        let account = store.getters['AccountStore/getSafeAccount'](JSON.parse(JSON.stringify(shownBeetApp)));
        
        if (!account) {
            console.log('No account')
            deepLinkInProgress.value = false;
            return;
        }

        // prompt the user with deeplinked action request
        ipcRenderer.send(
            'createPopup',
            {
                request: request,
                accounts: [account]
            }
        );

        ipcRenderer.once(`popupApproved_${request.id}`, (event, result) => {
            console.log('User approved deeplink')
            deepLinkInProgress.value = false;
        })

        ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
            console.log('User rejected deeplink')
            deepLinkInProgress.value = false;
        })
    })
</script>

<template>
    <div class="bottom p-0">
        <span>
            <span v-if="deepLinkInProgress">
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
                <p style="marginBottom:0px;">
                    {{ t('common.totp.label') }}<br/>
                    {{ t('common.totp.prompt') }}
                </p>
                <ui-card v-if="!data || !data.length" outlined style="marginTop: 5px;">
                    {{ t('common.totp.unsupported') }}
                </ui-card>
                <ui-card v-else outlined style="marginTop: 5px;">
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
                        <ui-item>
                            <ui-chips v-if="!hasSelectedNewRows" style="padding-left: 24%;" id="input-chip-set" type="input">
                                <ui-chip icon="security">
                                    {{ selectedRows ? selectedRows.length : 0 }} {{ t('common.totp.chosen') }}
                                </ui-chip>
                            </ui-chips>
                            <ui-chips v-else id="input-chip-set" type="input">
                                <ui-chip icon="security">
                                    {{ selectedRows ? selectedRows.length : 0 }} {{ t('common.totp.chosen') }}
                                </ui-chip>
                                <ui-chip icon="save" @click="saveRows">
                                    {{ t('common.totp.save') }}
                                </ui-chip>
                            </ui-chips>
                        </ui-item>
                        <ui-item>
                            <ui-chips style="padding-left: 25%;" v-if="!newCodeRequested && selectedRows && selectedRows.length > 0 && !timeLimit" id="input-chip-set" type="input">
                                <ui-chip @click="setTime(60)">
                                    60s
                                </ui-chip>
                                <ui-chip @click="setTime(180)">
                                    3m
                                </ui-chip>
                                <ui-chip @click="setTime(600)">
                                    10m
                                </ui-chip>
                            </ui-chips>
                            <ui-chips style="padding-left: 25%;" id="input-chip-set" type="input">
                                <ui-chip v-if="!newCodeRequested && !selectedRows || !selectedRows.length" icon="arrow_upward">
                                    {{ t('common.totp.default') }}
                                </ui-chip>
                                <ui-chip v-if="!newCodeRequested && selectedRows && selectedRows.length > 0 && timeLimit" icon="generating_tokens" @click="requestCode">
                                    {{ t('common.totp.request') }}
                                </ui-chip>
                                <ui-chip v-else-if="selectedRows && selectedRows.length && newCodeRequested" icon="access_time">
                                    {{ t('common.totp.time') }}: {{ timeLimit - progress.toFixed(0) }}s
                                </ui-chip>
                        </ui-chips>
                        </ui-item>
                    </ui-list>
                    <ui-textfield v-if="currentCode && newCodeRequested" style="margin:5px;" v-model="currentCode" outlined :attrs="{ readonly: true }">
                        <template #after>
                            <ui-textfield-icon v-copy="copyContents">content_copy</ui-textfield-icon>
                        </template>
                    </ui-textfield>
                    <ui-alert v-if="currentCode && newCodeRequested" state="warning" closable>
                        {{ t('common.totp.warning') }}
                    </ui-alert>
                </ui-card>
            </span>

            <router-link
                :to="'/dashboard'"
                replace
            >
                <ui-button
                    outlined
                    class="step_btn"
                >
                    {{ t('common.totp.exit') }}
                </ui-button>
            </router-link>
        </span>
    </div>
</template>
