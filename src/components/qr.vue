<script setup>
    import { ref, computed, inject } from 'vue';
    import { useI18n } from 'vue-i18n';

    import QRDrag from "./qr/Drag";
    import QRScan from "./qr/Scan";
    import QRUpload from "./qr/Upload";
    import AccountSelect from "./account-select";
    import Operations from "./blockchains/operations";
    
    import getBlockchainAPI from "../lib/blockchains/blockchainFactory";
    import store from '../store/index';

    const { t } = useI18n({ useScope: 'global' });
    const emitter = inject('emitter');

    let qrChoice = ref();
    let opPermissions = ref();
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

    let settingsRows = computed(() => {
        // last approved operation rows for this chain
        let chain = store.getters['AccountStore/getChain']
        let rememberedRows = store.getters['SettingsStore/getChainTOTP'](chain);
        if (!rememberedRows || !rememberedRows.length) {
            return [];
        }

        return rememberedRows;
    });

    function setScope(newValue) {
        opPermissions.value = newValue;
        if (newValue === 'AllowAll') {
            selectedRows.value = true;
            let chain = store.getters['AccountStore/getChain'];
            let types = getBlockchainAPI(chain).getOperationTypes();
            store.dispatch(
                "SettingsStore/setChainTOTP",
                {
                    chain: chain,
                    rows: types.map(type => type.id)
                }
            );
        }
    }
</script>

<template>
    <div class="bottom p-0">
        <span>
            <AccountSelect />

            <span v-if="!settingsRows || !settingsRows.length">
                <ui-card outlined style="marginTop: 5px;">
                    {{ t('common.totp.unsupported') }}
                </ui-card>
            </span>
            <span v-else-if="!opPermissions">
                <p>
                    Do you wish to configure the scope of scannable QR codes?
                </p>
                <ui-button raised style="margin-right:5px; margin-bottom: 5px;" @click="setScope('Configure')">
                    Yes - customize scope
                </ui-button>
                <ui-button raised style="margin-right:5px; margin-bottom: 5px;" @click="setScope('AllowAll')">
                    No - allow all operations
                </ui-button>
            </span>
            <span v-else-if="opPermissions == 'Configure' && !selectedRows">
                <Operations />
            </span>
            
            <span v-if="opPermissions && settingsRows && selectedRows">
                <span v-if="qrChoice && qrChoice === 'Scan'">
                    <QRScan />
                    <br/>
                    <ui-button @click="undoQRChoice()">
                        {{ t('common.qr.back') }}
                    </ui-button>
                </span>
                <span v-else-if="qrChoice && qrChoice === 'Drag'">
                    <QRDrag />
                    <br/>
                    <ui-button @click="undoQRChoice()">
                        {{ t('common.qr.back') }}
                    </ui-button>
                </span>
                <span v-else-if="qrChoice && qrChoice === 'Upload'">
                    <QRUpload />
                    <br/>
                    <ui-button @click="undoQRChoice()">
                        {{ t('common.qr.back') }}
                    </ui-button>
                </span>
                <span v-else>
                    <p style="marginBottom:0px;">
                        {{ t('common.qr.main.title') }}
                    </p>
                    <br/>
                    <ui-button raised style="margin-bottom: 10px;" @click="setChoice('Scan')">
                        {{ t('common.qr.main.scan') }}
                    </ui-button>
                    <br/>
                    <ui-button raised style="margin-bottom: 10px;" @click="setChoice('Drag')">
                        {{ t('common.qr.main.drag') }}
                    </ui-button>
                    <br/>
                    <ui-button raised style="margin-bottom: 10px;" @click="setChoice('Upload')">
                        {{ t('common.qr.main.upload') }}
                    </ui-button>
                </span>
            </span>

            <br/>
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
    </div>
</template>
