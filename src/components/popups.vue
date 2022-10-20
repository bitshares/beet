<script setup>
    import { computed } from "vue";
    import queryString from "query-string";
    import { useI18n } from 'vue-i18n';

    import * as Actions from '../lib/Actions';

    import LinkRequestPopup from "./popups/linkrequestpopup";
    import ReLinkRequestPopup from "./popups/relinkrequestpopup";
    import IdentityRequestPopup from "./popups/identityrequestpopup";
    import GenericRequestPopup from "./popups/genericrequestpopup";
    import SignMessageRequestPopup from "./popups/signedmessagepopup";
    import TransactionRequestPopup from "./popups/transactionrequestpopup";
    import TransferRequestPopup from "./popups/transferrequestpopup";

    const { t } = useI18n({ useScope: 'global' });

    function handleProp(target) {
        if (!global || !global.location || !global.location.search) {
            return '';
        }

        let qs;
        try {
            qs = queryString.parse(global.location.search);
        } catch (error) {
            console.log(error);
            return;
        }

        if (!qs[target]) {
            return;
        }

        let qsTarget = qs[target];
        let decoded = decodeURIComponent(qsTarget);
        return decoded;
    }

    let type = computed(() => {
        return handleProp('type');
    });

    let toSend = computed(() => {
        return handleProp('toSend');
    });

    let chain = computed(() => {
        return handleProp('chain');
    });

    let accountName = computed(() => {
        return handleProp('accountName');
    });

    let target = computed(() => {
        return handleProp('target');
    });

    let warning = computed(() => {
        let thisWarning = handleProp('warning');
        return thisWarning
    });

    let visualizedAccount = computed(() => {
        return handleProp('visualizedAccount');
    });

    let visualizedParams = computed(() => {
        return handleProp('visualizedParams');
    });

    let request = computed(() => {
        let req = handleProp('request');
        return req ? JSON.parse(req) : null;
    });

    let moreRequest = computed(() => {
        let req = handleProp('request');
        return req ? JSON.stringify(JSON.parse(req), undefined, 4) : null;
    });

    let payload = computed(() => {
        let req = handleProp('payload');
        return req ? JSON.parse(req) : null;
    });

    let accounts = computed(() => {
        let req = handleProp('accounts');
        let parsedReq = req ? JSON.parse(req) : null;

        let request = handleProp('request')
        let parsedRequest = request ? JSON.parse(request) : null;

        let filteredAccounts = parsedReq.filter(account => parsedRequest.payload.chain === account.chain);
        return filteredAccounts;
    });

    let existingLinks = computed(() => {
        let req = handleProp('existingLinks');
        return req ? JSON.parse(req) : null;
    });
</script>

<template>
    <div v-if="type && type !== '' && request">
        <ui-collapse with-icon ripple modelValue={{True}}>
            <template #toggle>
                <div>{{ t('common.popup.preview') }}</div>
            </template>
            <div style="margin-bottom: 5px;">
                <LinkRequestPopup
                    v-if="type === Actions.REQUEST_LINK"
                    :request="request"
                    :accounts="accounts"
                    :existing-links="existingLinks"
                />
                <ReLinkRequestPopup
                    v-else-if="type === Actions.REQUEST_RELINK"
                    :request="request"
                    :accounts="accounts"
                />
                <IdentityRequestPopup
                    v-else-if="type === Actions.GET_ACCOUNT"
                    :request="request"
                    :accounts="accounts"
                />
                <GenericRequestPopup
                    v-else-if="type === Actions.VOTE_FOR"
                    :request="request"
                    :payload="payload"
                />
                <SignMessageRequestPopup
                    v-else-if="type === Actions.SIGN_MESSAGE || type === Actions.SIGN_NFT"
                    :request="request"
                    :accounts="accounts"
                />
                <TransferRequestPopup
                    v-else-if="type === Actions.TRANSFER"
                    :request="request"
                    :chain="chain"
                    :account-name="accountName"
                    :target="target"
                    :warning="warning"
                    :to-send="toSend"
                />
                <TransactionRequestPopup
                    v-else-if="type === Actions.REQUEST_SIGNATURE || type === Actions.INJECTED_CALL"
                    :request="request"
                    :visualized-params="visualizedParams"
                    :visualized-account="visualizedAccount"
                />
            </div>
        </ui-collapse>
        <ui-collapse v-if="moreRequest" with-icon ripple>
            <template #toggle>
                <div>{{ t('common.popup.request') }}</div>
            </template>
            <div>
                <ui-textfield
                    v-model="moreRequest"
                    input-type="textarea"
                    fullwidth
                    disabled
                    rows="8"
                />
            </div>
        </ui-collapse>
        <ui-collapse v-if="payload" with-icon ripple>
            <template #toggle>
                <div>{{ t('common.popup.payload') }}</div>
            </template>
            <div>
                <ui-textfield
                    v-model="payload"
                    input-type="textarea"
                    fullwidth
                    disabled
                    rows="8"
                />
            </div>
        </ui-collapse>       
    </div>
    <div v-else>
        Error: Unable to load prompt.
    </div>
</template>
