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

    function handleProp(target) {
        if (!global || !global.location || !global.location.search) {
            return '';
        }

        let qs;
        try {
            qs = queryString.parse(global.location.search);
        } catch (error) {
            console.log(error);
        }

        return qs && qs[target]
            ? qs[target]
            : '';
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

    let visualizedAccount = computed(() => {
        return handleProp('visualizedAccount');
    });

    let visualizedParams = computed(() => {
        return handleProp('visualizedParams');
    });

    let request = computed(() => {
        return JSON.parse(handleProp('request'));
    });

    let payload = computed(() => {
        return JSON.parse(handleProp('payload'));
    })

    let accounts = computed(() => {
        return JSON.parse(handleProp('accounts'));
    });

    let existingLinks = computed(() => {
        return JSON.parse(handleProp('existingLinks'));
    });
</script>

<template>
    <div v-if="type && type !== '' && request">
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
            v-else-if="type === Actions.VOTE_FOR || type === Actions.VERIFY_MESSAGE"
            :request="request"
            :payload="payload"
        />
        <SignMessageRequestPopup
            v-else-if="type === Actions.SIGN_MESSAGE"
            :request="request"
            :accounts="accounts"
        />
        <TransferRequestPopup
            v-else-if="type === Actions.TRANSFER"
            :request="request"
            :chain="chain"
            :account-name="accountName"
            :to-send="toSend"
        />
        <TransactionRequestPopup
            v-else-if="type === Actions.REQUEST_SIGNATURE || type === Actions.INJECTED_CALL"
            :request="request"
            :visualized-params="visualizedParams"
            :visualized-account="visualizedAccount"
        />
    </div>
    <div v-else>
        Error: Unable to load prompt.
    </div>
</template>
