<script setup>
    import { ref, onMounted } from "vue";
    import queryString from "query-string";

    import LinkRequestPopup from "./popups/linkrequestpopup";
    import IdentityRequestPopup from "./popups/identityrequestpopup";
    import ReLinkRequestPopup from "./popups/relinkrequestpopup";
    import GenericRequestPopup from "./popups/genericrequestpopup";
    import TransactionRequestPopup from "./popups/transactionrequestpopup";
    import TransferRequestPopup from "./popups/transferrequestpopup";
    import SignMessageRequestPopup from "./popups/signedmessagepopup";

    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    let qs = ref(queryString.parse(location.search));

    //let dismissCountDown = ref(0);
    //let transientMsg = ref('');
    //let transientLink = ref('');

    /*
    this.emitter.on("tx-success", (data) => {
        dismissCountDown.value = 5;
        transientMsg.value = data.msg;
        transientLink.value = data.link;
    });
    */

    onMounted() {
        logger.debug("Modal mounted");
    }
</script>

<template>
    <div>
        <LinkRequestPopup
          v-if="qs.type === 'linkReqModal'"
          ref="linkReqModal"
        />
        <ReLinkRequestPopup
          v-else-if="qs.type === 'reLinkReqModal'"
          ref="reLinkReqModal"
        />
        <IdentityRequestPopup
          v-else-if="qs.type === 'identityReqModal'"
          ref="identityReqModal"
        />
        <SignMessageRequestPopup
          v-else-if="qs.type === 'signMessageModal'"
          ref="signMessageModal"
        />
        <TransferRequestPopup
          v-else-if="qs.type === 'transferReqModal'"
          ref="transferReqModal"
        />
        <TransactionRequestPopup
          v-else-if="qs.type === 'transactionReqModal'"
          ref="transactionReqModal"
        />
        <GenericRequestPopup
          v-else-if="qs.type === 'genericReqModal'"
          ref="genericReqModal"
        />
    </div>
</template>
