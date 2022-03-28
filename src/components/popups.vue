<script setup>
    import {ipcRenderer} from "electron";
    import { onMounted, onBeforeMount, computed, ref } from "vue";
    import queryString from "query-string";

    import LinkRequestPopup from "./popups/linkrequestpopup";

    /*
    import IdentityRequestPopup from "./popups/identityrequestpopup";
    import ReLinkRequestPopup from "./popups/relinkrequestpopup";
    import GenericRequestPopup from "./popups/genericrequestpopup";
    import TransactionRequestPopup from "./popups/transactionrequestpopup";
    import TransferRequestPopup from "./popups/transferrequestpopup";
    import SignMessageRequestPopup from "./popups/signedmessagepopup";
    */

    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    let type = computed(() => {
        let qs = queryString.parse(global.location.search);
        return qs.type;
    });

    let request = computed(() => {
      let qs = queryString.parse(global.location.search);
      return JSON.parse(qs.request);
    });

    let accounts = computed(() => {
      let qs = queryString.parse(global.location.search);
      return JSON.parse(qs.accounts);
    });

    let existingLinks = computed(() => {
      let qs = queryString.parse(global.location.search);
      return JSON.parse(qs.existingLinks);
    });

    onMounted(() => {
        logger.debug("Modal mounted");
    })

    /*
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
    */
</script>

<template>
    <div v-if="type && request">
      <LinkRequestPopup
        v-if="type === 'link'"
        :request="request"
        :accounts="accounts"
        :existingLinks="existingLinks"
      />
    </div>
    <div v-else>
        Couldn't load modal
    </div>
</template>
