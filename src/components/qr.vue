<script setup>
    import { ref } from 'vue';
    import { useI18n } from 'vue-i18n';

    import QRDrag from "./qr/Drag";
    import QRScan from "./qr/Scan";
    import QRUpload from "./qr/Upload";
    import AccountSelect from "./account-select";

    const { t } = useI18n({ useScope: 'global' });
    let qrChoice = ref();

    function goBack() {
        qrChoice.value = null;
    }

    function setChoice(choice) {
        qrChoice.value = choice;
    }
</script>

<template>
    <div class="bottom p-0">
        <span>
            <AccountSelect />
            <span v-if="qrChoice && qrChoice === 'Scan'">
                <QRScan />
                <br/>
                <ui-button @click="goBack()">
                    {{ t('common.qr.back') }}
                </ui-button>
            </span>
            <span v-else-if="qrChoice && qrChoice === 'Drag'">
                <QRDrag />
                <br/>
                <ui-button @click="goBack()">
                    {{ t('common.qr.back') }}
                </ui-button>
            </span>
            <span v-else-if="qrChoice && qrChoice === 'Upload'">
                <QRUpload />
                <br/>
                <ui-button @click="goBack()">
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
            <br/>
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
