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

    let qrInProgress = ref(false);
</script>

<template>
    <div class="bottom p-0">
        <span>
            <span v-if="qrInProgress">
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
                    QR Scanner
                </p>
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
