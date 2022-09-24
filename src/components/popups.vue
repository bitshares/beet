<script setup>
    import { computed } from "vue";
    import queryString from "query-string";

    import * as Actions from '../lib/Actions';

    import LinkRequestPopup from "./popups/linkrequestpopup";
    import ReLinkRequestPopup from "./popups/relinkrequestpopup";
    import IdentityRequestPopup from "./popups/identityrequestpopup";
    import GenericRequestPopup from "./popups/genericrequestpopup";
    import SignMessageRequestPopup from "./popups/signedmessagepopup";
    import TransactionRequestPopup from "./popups/transactionrequestpopup";
    import TransferRequestPopup from "./popups/transferrequestpopup";
    import langSelect from "./lang-select.vue";

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

    let injectables = computed(() => {
        let req = handleProp('injectables');
        return req ? JSON.parse(req) : null;
    });
</script>

<template>
    <div v-if="type && type !== '' && request">
        <LinkRequestPopup
            v-if="type === Actions.REQUEST_LINK"
            :request="request"
            :accounts="accounts"
            :existing-links="existingLinks"
            :injectables="injectables"
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
        <br />
        <div style="padding:10px">
            <langSelect />
        </div>
    </div>
    <div v-else>
        Error: Unable to load prompt.
    </div>
</template>
