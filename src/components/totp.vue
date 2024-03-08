<script setup>
    import { onMounted, watchEffect, watch, ref, computed, inject } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { ipcRenderer } from "electron";
    import { v4 as uuidv4 } from 'uuid';

    import sha512 from "crypto-js/sha512.js";
    import aes from "crypto-js/aes.js";
    import ENC from 'crypto-js/enc-utf8.js';
    import Base64 from 'crypto-js/enc-base64';

    import getBlockchainAPI from "../lib/blockchains/blockchainFactory";
    import AccountSelect from "./account-select";
    import * as Actions from '../lib/Actions';
    import store from '../store/index';
    import router from '../router/index.js';

    import {
        injectedCall,
        voteFor,
        transfer
    } from '../lib/apiUtils.js';

    import Operations from "./blockchains/operations";

    const { t } = useI18n({ useScope: 'global' });
    const emitter = inject('emitter');

    let settingsRows = computed(() => { // last approved TOTP rows for this chain
        if (!store.state.WalletStore.isUnlocked) {
            return;
        }

        let chain = store.getters['AccountStore/getChain']
        let rememberedRows = store.getters['SettingsStore/getChainPermissions'](chain);
        if (!rememberedRows || !rememberedRows.length) {
            return [];
        }

        return rememberedRows;
    });
    
    let supportsTOTP = computed(() => {
        let chain = store.getters['AccountStore/getChain'];
        return getBlockchainAPI(chain).supportsTOTP();
    });

    let selectedRows = ref();
    emitter.on('selectedRows', (data) => {
        selectedRows.value = data;
    })

    let opPermissions = ref();
    function setScope(newValue) {
        opPermissions.value = newValue;
        if (newValue === 'AllowAll') {
            selectedRows.value = true;
            let chain = store.getters['AccountStore/getChain'];
            let types = getBlockchainAPI(chain).getOperationTypes();
            store.dispatch(
                "SettingsStore/setChainPermissions",
                {
                    chain: chain,
                    rows: types.map(type => type.id)
                }
            );
        }
    }
    emitter.on('exitOperations', () => {
        opPermissions.value = null;
        selectedRows.value = null;
    })

    function goBack() {
        opPermissions.value = null;
        selectedRows.value = null;
        //
        timestamp.value = null;
        newCodeRequested.value = null;
        timeLimit.value = null;
        progress.value = 0;
    }

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
        if (!store.state.WalletStore.isUnlocked || router.currentRoute.value.path != "/totp") {
            console.log("Wallet must be unlocked for deeplinks to work.");
            ipcRenderer.send("notify", t("common.totp.promptFailure"));
            return;
        }

        deepLinkInProgress.value = true;
        if (!currentCode.value) {
            console.log('No auth key')
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

        if (
            !request
            || !request.id
            || !request.payload
            || !request.payload.chain
            || !request.payload.method
            || request.payload.method === Actions.INJECTED_CALL && !request.payload.params
        ) {
            console.log('invalid request format')
            deepLinkInProgress.value = false;
            return;
        }
        
        let requestedChain = args.chain || request.payload.chain;
        let chain = store.getters['AccountStore/getChain'];
        if (!requestedChain || chain !== requestedChain) {
            console.log("Incoming deeplink request for wrong chain");
            ipcRenderer.send("notify", t("common.totp.failed"));
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
        } else {
            console.log({
                msg: "Unsupported request type rejected",
                apiobj
            })
        }

        if (!blockchain) {
            console.log('no blockchain')
            deepLinkInProgress.value = false;
            return;
        }

        if (!settingsRows.value.includes(apiobj.type)) {
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
                if (settingsRows.value && settingsRows.value.includes(operation[0])) {
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
            console.log({error: error || "No status"});
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
    <div
        v-if="settingsRows"
        class="bottom p-0"
    >
        <span v-if="supportsTOTP">
            <AccountSelect />
            <span v-if="deepLinkInProgress">
                <p style="marginBottom:0px;">
                    {{ t('common.totp.inProgress') }}
                </p>
                <ui-card
                    v-shadow="3"
                    outlined
                    style="marginTop: 5px;"
                >
                    <br>
                    <ui-progress indeterminate />
                    <br>
                </ui-card>
            </span>
            <span v-else>
                <p style="marginBottom:0px;">
                    {{ t('common.totp.label') }}
                </p>
                <ui-card
                    v-shadow="3"
                    outlined
                    style="marginTop: 5px;"
                >
                    <span v-if="!opPermissions">
                        <p>
                            {{ t('common.opPermissions.title.totp') }}
                        </p>
                        <ui-button
                            raised
                            style="margin-right:5px; margin-bottom: 5px;"
                            @click="setScope('Configure')"
                        >
                            {{ t('common.opPermissions.yes') }}
                        </ui-button>
                        <ui-button
                            raised
                            style="margin-right:5px; margin-bottom: 5px;"
                            @click="setScope('AllowAll')"
                        >
                            {{ t('common.opPermissions.no') }}
                        </ui-button>
                    </span>
                    <span v-else-if="opPermissions == 'Configure' && !selectedRows">
                        <Operations />
                    </span>

                    <span v-if="opPermissions && settingsRows && selectedRows">
                        <ui-chips
                            id="input-chip-set"
                            type="input"
                        >
                            <ui-chip
                                icon="security"
                                style="margin-left:30px;"
                            >
                                {{ settingsRows ? settingsRows.length : 0 }} {{ t('common.totp.chosen') }}
                            </ui-chip>
                            <ui-chip
                                v-if="settingsRows && settingsRows.length && newCodeRequested"
                                icon="access_time"
                            >
                                {{ t('common.totp.time') }}: {{ timeLimit - progress.toFixed(0) }}s
                            </ui-chip>
                        </ui-chips>
                        <span
                            v-if="!newCodeRequested && settingsRows && settingsRows.length > 0 && !timeLimit"
                            style="padding-left: 20px;"
                        >
                            <ui-button
                                raised
                                style="margin-right:10px; margin-bottom: 10px;"
                                @click="setTime(60)"
                            >
                                60s
                            </ui-button>
                            <ui-button
                                raised
                                style="margin-right:10px; margin-bottom: 10px;"
                                @click="setTime(180)"
                            >
                                3m
                            </ui-button>
                            <ui-button
                                raised
                                style="margin-bottom: 10px;"
                                @click="setTime(600)"
                            >
                                10m
                            </ui-button>
                        </span>
                        <span>
                            <ui-button
                                v-if="!newCodeRequested && settingsRows && settingsRows.length > 0 && timeLimit"
                                icon="generating_tokens"
                                raised
                                style="margin-left: 30px; margin-right:5px; margin-bottom: 10px;"
                                @click="requestCode"
                            >
                                {{ t('common.totp.request') }}
                            </ui-button>
                        </span>
                        <ui-textfield
                            v-if="currentCode && newCodeRequested"
                            v-model="currentCode"
                            style="margin:5px;"
                            outlined
                            :attrs="{ readonly: true }"
                        >
                            <template #after>
                                <ui-textfield-icon v-copy="copyContents">content_copy</ui-textfield-icon>
                            </template>
                        </ui-textfield>
                        <ui-alert
                            v-if="currentCode && newCodeRequested"
                            style="margin:10px;"
                            state="warning"
                            closable
                        >
                            {{ t('common.totp.warning') }}
                        </ui-alert>
                    </span>
                </ui-card>
            </span>

            <ui-button
                v-if="opPermissions && selectedRows"
                style="margin-right:5px"
                icon="arrow_back_ios"
                @click="goBack"
            >
                {{ t('common.qr.back') }}
            </ui-button>
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
        <span v-else>
            {{ t('common.totp.notSupported') }}
        </span>
    </div>
</template>