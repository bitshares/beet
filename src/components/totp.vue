<script setup>
    import { onMounted, watchEffect, watch, ref, computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { ipcRenderer } from "electron";
    import { v4 as uuidv4 } from 'uuid';
    import sha512 from "crypto-js/sha512.js";
    import store from '../store/index';
    import getBlockchainAPI from "../lib/blockchains/blockchainFactory";
    import aes from "crypto-js/aes.js";
    import ENC from 'crypto-js/enc-utf8.js';
    import Base64 from 'crypto-js/enc-base64';
    import * as Actions from '../lib/Actions';

    import {
        injectedCall,
        voteFor,
        transfer
    } from '../lib/apiUtils.js';

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
            let chain = store.getters['AccountStore/getChain'];
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
                selectedRows.value && selectedRows.value.sort().join('') === settingsRows.value.sort().join('')
            ) {
                // initial setting of settingsrows
                console.log('Existing TOTP settings applied')
                hasSelectedNewRows.value = false;
            } else if (selectedRows.value && selectedRows.value.sort().join('') !== settingsRows.value.sort().join('')) {
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
        if (!store.state.WalletStore.isUnlocked) {
            console.log("Wallet must be unlocked for deeplinks to work.")
            return;
        }

        deepLinkInProgress.value = true;
        if (!currentCode.value) {
            console.log('No auth key')
            deepLinkInProgress.value = false;
            return;
        }

        let requestedChain = args.chain ?? null;       
        let chain = store.getters['AccountStore/getChain'];
        if (!requestedChain || !chain === requestedChain) {
            console.log("Invalid deeplink prompt");
            deepLinkInProgress.value = false;
            return;
        }
        
        let processedRequest;
        try {
            processedRequest = decodeURIComponent(args.request);
        } catch (error) {
            console.log('Processing request failed')
            deepLinkInProgress.value = false;
            return;
        }
        
        let parsedRequest;
        try {
            parsedRequest = Base64.parse(processedRequest).toString(ENC)
        } catch (error) {
            console.log('Parsing request failed')
            deepLinkInProgress.value = false;
            return;
        }

        let decryptedBytes;
        try {
            decryptedBytes = aes.decrypt(parsedRequest, currentCode.value);
        } catch (error) {
            console.log(error);
            deepLinkInProgress.value = false;
            return;
        }

        let decryptedData;
        try {
            decryptedData = decryptedBytes.toString(ENC);
        } catch (error) {
            console.log(error);
            deepLinkInProgress.value = false;
            return;
        }

        let request;
        try {
            request = JSON.parse(decryptedData);
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

        if (!Object.keys(Actions).map(key => Actions[key]).includes(request.payload.method)) {
            console.log("Unsupported request type rejected");
            return;
        }

        let blockchainActions = [
            Actions.TRANSFER,
            Actions.VOTE_FOR,
            Actions.INJECTED_CALL
        ];

        let apiobj = {
            id: request.id,
            type: request.payload.method,
            payload: request.payload
        };

        let blockchain;
        if (blockchainActions.includes(apiobj.type)) {
            try {
                blockchain = await getBlockchainAPI(chain);
            } catch (error) {
                console.log(error);
                deepLinkInProgress.value = false;
                return;
            }
        }

        if (!blockchain) {
            console.log('no blockchain')
            deepLinkInProgress.value = false;
            return;
        }

        if (!selectedRows.value.includes(apiobj.type)) {
            console.log("Unauthorized beet operation")
            deepLinkInProgress.value = false;
            return;
        }

        if (apiobj.type === Actions.INJECTED_CALL) {
            let tr;
            try {
                tr = blockchain._parseTransactionBuilder(request.payload.params);
            } catch (error) {
                console.log(error)
            }

            let authorizedUse = false;
            for (let i = 0; i < tr.operations.length; i++) {
                let operation = tr.operations[i];
                if (selectedRows.value.includes(operation[0])) {
                    authorizedUse = true;
                    break;
                }
            }

            if (!authorizedUse) {
                console.log(`Unauthorized use of deeplinked ${chain} blockchain operation`);              
                deepLinkInProgress.value = false;
                return;
            }
            console.log("Authorized use of deeplinks")
        }

        let account = store.getters['AccountStore/getCurrentSafeAccount']();
        if (!account) {
            console.log('No account')
            deepLinkInProgress.value = false;
            return;
        }

        let status;
        try {
            if (apiobj.type === Actions.INJECTED_CALL) {
                status = await injectedCall(apiobj, blockchain);
            } else if (apiobj.type === Actions.VOTE_FOR) {
                status = await voteFor(apiobj, blockchain);
            } else if (apiobj.type === Actions.TRANSFER) {
                status = await transfer(apiobj, blockchain);
            }
        } catch (error) {
            console.log(error || "No status")
            deepLinkInProgress.value = false;
            return;
        }

        if (!status || !status.result || status.result.isError || status.result.canceled) {
            console.log("Issue occurred in approved prompt");
            deepLinkInProgress.value = false;
            return;
        }

        console.log(status);
        deepLinkInProgress.value = false;
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
                                <ui-button raised style="margin-right:5px" icon="save" @click="saveRows">
                                    {{ t('common.totp.save') }}
                                </ui-button>
                            </ui-chips>
                        </ui-item>
                        <ui-item>
                            <span style="padding-left: 22%;" v-if="!newCodeRequested && selectedRows && selectedRows.length > 0 && !timeLimit">
                                <ui-button raised style="margin-right:5px" @click="setTime(60)">
                                    60s
                                </ui-button>
                                <ui-button raised style="margin-right:5px" @click="setTime(180)">
                                    3m
                                </ui-button>
                                <ui-button raised style="margin-right:5px" @click="setTime(600)">
                                    10m
                                </ui-button>
                            </span>
                            <span style="padding-left: 22%;">
                                <ui-button
                                    v-if="!newCodeRequested && !selectedRows || !selectedRows.length"
                                    icon="arrow_upward"
                                    raised
                                    style="margin-right:5px"
                                >
                                    {{ t('common.totp.default') }}
                                </ui-button>
                                <ui-button
                                    v-if="!newCodeRequested && selectedRows && selectedRows.length > 0 && timeLimit"
                                    icon="generating_tokens"
                                    @click="requestCode"
                                    raised
                                    style="margin-right:5px"
                                >
                                    {{ t('common.totp.request') }}
                                </ui-button>
                                <ui-chips v-else-if="selectedRows && selectedRows.length && newCodeRequested" id="input-chip-set" type="input">
                                    <ui-chip icon="access_time">
                                        {{ t('common.totp.time') }}: {{ timeLimit - progress.toFixed(0) }}s
                                    </ui-chip>
                                </ui-chips>
                            </span>
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
