<script setup>
    import { ref, computed, inject } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { ipcRenderer } from "electron";

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
    }

    let deepLinkInProgress = ref(false);
    ipcRenderer.on('rawdeeplink', async (event, args) => {
        /**
         * Raw Deeplink
         */
        if (!store.state.WalletStore.isUnlocked || router.currentRoute.value.path != "/raw-link") {
            console.log("Wallet must be unlocked for raw deeplinks to work.");
            ipcRenderer.send("notify", t("common.raw.promptFailure"));
            return;
        }

        deepLinkInProgress.value = true;
       
        let processedRequest;
        try {
            processedRequest = decodeURIComponent(args.request);
        } catch (error) {
            console.log('Processing request failed');
            deepLinkInProgress.value = false;
            return;
        }

        let request;
        try {
            request = JSON.parse(processedRequest);
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
            ipcRenderer.send("notify", t("common.raw.failed"));
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
                console.log(`Unauthorized use of raw deeplinked ${chain} blockchain operation`);              
                deepLinkInProgress.value = false;
                return;
            }
            console.log("Authorized use of raw deeplinks")
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
                    {{ t('common.raw.label') }}
                </p>
                <ui-card
                    v-shadow="3"
                    outlined
                    style="marginTop: 5px;"
                >
                    <span v-if="!opPermissions">
                        <p>
                            {{ t('common.opPermissions.title.rawLink') }}
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
                                icon="thumb_up"
                            >
                                Ready for raw links!
                            </ui-chip>
                        </ui-chips>
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
