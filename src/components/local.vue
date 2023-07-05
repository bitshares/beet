<script setup>
    import { ref, computed, inject } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { ipcRenderer } from "electron";
    import { v4 as uuidv4 } from 'uuid';
    import fs from 'fs';

    import AccountSelect from "./account-select";
    import Operations from "./blockchains/operations";
    import * as Actions from '../lib/Actions';

    import { injectedCall, voteFor, transfer } from '../lib/apiUtils.js';
    import getBlockchainAPI from "../lib/blockchains/blockchainFactory";
    import store from '../store/index';

    const { t } = useI18n({ useScope: 'global' });
    const emitter = inject('emitter');

    let opPermissions = ref();
    let selectedRows = ref();
    let inProgress = ref(false);

    emitter.on('selectedRows', (data) => {
        selectedRows.value = data;
    })

    emitter.on('exitOperations', () => {
        opPermissions.value = null;
        selectedRows.value = null;
    })

    function goBack() {
        opPermissions.value = null;
        selectedRows.value = null;
    }

    let settingsRows = computed(() => { // last approved operation rows for this chain
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

    let supportsLocal = computed(() => {
        let chain = store.getters['AccountStore/getChain'];
        return getBlockchainAPI(chain).supportsLocal();
    });

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

    function onChange(a) {
        fs.readFile(a[0].sourceFile.path, 'utf-8', async (err, data) => {
            inProgress.value = true;
            if (err) {
                alert("An error ocurred reading the file :" + err.message);
                return;
            }

            let request;
            try {
                request = JSON.parse(data);
            } catch (error) {
                console.log(error);
                inProgress.value = false;
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
                inProgress.value = false;
                return;
            }

            let requestedChain = request.payload.chain;
            let chain = store.getters['AccountStore/getChain'];
            if (!requestedChain || chain !== requestedChain) {
                console.log("Incoming uploaded request for wrong chain");
                ipcRenderer.send("notify", t("common.local.promptFailure"));
                inProgress.value = false;
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
                    inProgress.value = false;
                    return;
                }
            }

            if (!blockchain) {
                console.log('no blockchain')
                inProgress.value = false;
                return;
            }

            if (!settingsRows.value.includes(apiobj.type)) {
                console.log("Unauthorized beet operation")
                inProgress.value = false;
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
                    console.log(`Unauthorized use of local ${chain} blockchain operation`);              
                    inProgress.value = false;
                    return;
                }
                console.log("Authorized use of local json upload")
            }

            let account = store.getters['AccountStore/getCurrentSafeAccount']();
            if (!account) {
                console.log('No account')
                inProgress.value = false;
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
                inProgress.value = false;
                return;
            }

            if (!status || !status.result || status.result.isError || status.result.canceled) {
                console.log("Issue occurred in approved prompt");
                inProgress.value = false;
                return;
            }

            ipcRenderer.send("notify", t("common.local.promptSuccess"));
            inProgress.value = false;
        });
    }

</script>

<template>
    <div
        v-if="settingsRows"
        class="bottom p-0"
    >
        <span v-if="supportsLocal">
            <span>
                <AccountSelect />
                <p
                    v-if="!opPermissions"
                    style="marginBottom:0px;"
                >
                    {{ t('common.local.label') }}
                </p>
                <ui-card
                    v-if="!selectedRows"
                    v-shadow="3"
                    outlined
                    style="marginTop: 5px;"
                >
                    <span v-if="!opPermissions">
                        <p>
                            {{ t('common.opPermissions.title.local') }}
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
                </ui-card>
            </span>

            
            <span v-if="opPermissions && settingsRows && selectedRows">
                <span v-if="!inProgress">
                    <h3>{{ t('common.local.upload') }}</h3>
                    <ui-file
                        accept="application/json"
                        @change="onChange($event)"
                    />
                </span>
                <span v-else>
                    <ui-spinner active />
                    <h3>{{ t('common.local.progress') }}</h3>
                </span>
            </span>

            <br>
            <ui-button
                v-if="opPermissions && selectedRows"
                style="margin-right:5px"
                icon="arrow_back_ios"
                @click="goBack"
            >
                {{ t('common.local.back') }}
            </ui-button>
            <router-link
                :to="'/dashboard'"
                replace
            >
                <ui-button
                    outlined
                    class="step_btn"
                >
                    {{ t('common.local.exit') }}
                </ui-button>
            </router-link>
        </span>
        <span v-else>
            {{ t('common.local.notSupported') }}
        </span>
    </div>
</template>
