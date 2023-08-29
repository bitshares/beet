<script setup>
    import { ref, computed, inject } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { ipcRenderer } from "electron";
    import { v4 as uuidv4 } from 'uuid';

    import AccountSelect from "./account-select";
    import Operations from "./blockchains/operations";
    import QRDrag from "./qr/Drag";
    import QRScan from "./qr/Scan";
    import QRUpload from "./qr/Upload";
    import * as Actions from '../lib/Actions';

    import { injectedCall } from '../lib/apiUtils.js';
    import getBlockchainAPI from "../lib/blockchains/blockchainFactory";
    import store from '../store/index';

    const { t } = useI18n({ useScope: 'global' });
    const emitter = inject('emitter');

    let opPermissions = ref();
    let qrInProgress = ref(false);
    let isValidQR = ref();

    emitter.on('detectedQR', async (data) => {
        qrInProgress.value = true;
        // check if valid operation in QR code
        let refChain = store.getters['AccountStore/getChain'];
        let blockchain = getBlockchainAPI(refChain);

        let qrTX;
        try {
            qrTX = await blockchain.handleQR(data);
        } catch (error) {
            console.log(error);
            ipcRenderer.send("notify", t("common.qr.promptFailure"));
            qrInProgress.value = false;
            return;
        }

        if (!qrTX) {
            console.log("Couldn't process scanned QR code, sorry.")
            ipcRenderer.send("notify", t("common.qr.promptFailure"));
            qrInProgress.value = false;
            return;
        }

        let authorizedUse = false;
        for (let i = 0; i < qrTX.operations.length; i++) {
            let operation = qrTX.operations[i];
            if (settingsRows.value && settingsRows.value.includes(operation[0])) {
                authorizedUse = true;
                break;
            }
        }

        if (!authorizedUse) {
            console.log(`Unauthorized QR use of ${refChain} blockchain operation`);
            ipcRenderer.send("notify", t("common.qr.promptFailure"));
            qrInProgress.value = false;
            return;
        }

        isValidQR.value = true;
        console.log('Authorized use of QR codes');

        let apiobj = {
            type: Actions.INJECTED_CALL,
            id: await uuidv4(),
            payload: {
                origin: 'localhost',
                appName: 'qr',
                browser: qrChoice.value,
                params: qrTX.toObject(),
                chain: refChain
            }
        }

        let status;
        try {
            status = await injectedCall(apiobj, blockchain);
        } catch (error) {
            console.log(error)
            ipcRenderer.send("notify", t("common.qr.promptFailure"));
            qrInProgress.value = false;
            return;
        }

        if (!status || !status.result || status.result.isError || status.result.canceled) {
            console.log("Issue occurred in approved prompt");
            ipcRenderer.send("notify", t("common.qr.promptFailure"));
            qrInProgress.value = false;
            return;
        }

        console.log(status);
        ipcRenderer.send("notify", t("common.qr.prompt_success"));
        qrInProgress.value = false;
    });

    let qrChoice = ref();
    let selectedRows = ref();

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

    function undoQRChoice () {
        qrChoice.value = null;
    }
 
    function setChoice(choice) {
        qrChoice.value = choice;
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

    let supportsQR = computed(() => {
        let chain = store.getters['AccountStore/getChain'];
        return getBlockchainAPI(chain).supportsQR();
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

</script>

<template>
    <div
        v-if="settingsRows"
        class="bottom p-0"
    >
        <span v-if="supportsQR">
            <span v-if="qrInProgress">
                <p>
                    {{ t('common.qr.progress') }}
                </p>
                <ui-spinner active />
            </span>
            <span v-else>
                <AccountSelect />
                <p
                    v-if="!opPermissions"
                    style="marginBottom:0px;"
                >
                    {{ t('common.qr.label') }}
                </p>
                <ui-card
                    v-if="!selectedRows"
                    v-shadow="3"
                    outlined
                    style="marginTop: 5px;"
                >
                    <span v-if="!opPermissions">
                        <p>
                            {{ t('common.opPermissions.title.qr') }}
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
                <span v-if="qrChoice && qrChoice === 'Scan'">
                    <QRScan />
                    <br>
                    <ui-button @click="undoQRChoice()">
                        {{ t('common.qr.back') }}
                    </ui-button>
                </span>
                <span v-else-if="qrChoice && qrChoice === 'Drag'">
                    <QRDrag />
                    <br>
                    <ui-button @click="undoQRChoice()">
                        {{ t('common.qr.back') }}
                    </ui-button>
                </span>
                <span v-else-if="qrChoice && qrChoice === 'Upload'">
                    <QRUpload />
                    <br>
                    <ui-button @click="undoQRChoice()">
                        {{ t('common.qr.back') }}
                    </ui-button>
                </span>
                <span v-else>
                    <p style="marginBottom:0px;">
                        {{ t('common.qr.main.title') }}
                    </p>
                    <br>
                    <ui-button
                        raised
                        style="margin-bottom: 10px;"
                        @click="setChoice('Drag')"
                    >
                        {{ t('common.qr.main.drag') }}
                    </ui-button>
                    <br>
                    <ui-button
                        raised
                        style="margin-bottom: 10px;"
                        @click="setChoice('Scan')"
                    >
                        {{ t('common.qr.main.scan') }}
                    </ui-button>
                    <br>
                    <ui-button
                        raised
                        style="margin-bottom: 10px;"
                        @click="setChoice('Upload')"
                    >
                        {{ t('common.qr.main.upload') }}
                    </ui-button>
                </span>
            </span>

            <br>
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
                    {{ t('common.qr.exit') }}
                </ui-button>
            </router-link>
        </span>
        <span v-else>
            {{ t('common.qr.notSupported') }}
        </span>
    </div>
</template>
