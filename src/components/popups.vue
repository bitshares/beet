<script setup>
    import { computed } from "vue";
    import queryString from "query-string";

    import LinkRequestPopup from "./popups/linkrequestpopup";
    import ReLinkRequestPopup from "./popups/relinkrequestpopup";
    import IdentityRequestPopup from "./popups/identityrequestpopup";
    import GenericRequestPopup from "./popups/genericrequestpopup";
    import SignMessageRequestPopup from "./popups/signedmessagepopup";
    import TransactionRequestPopup from "./popups/transactionrequestpopup";
    import TransferRequestPopup from "./popups/transferrequestpopup";

    let type = computed(() => {
        let qs = queryString.parse(global.location.search);
        return qs.type;
    });

    let request = computed(() => {
      let qs = queryString.parse(global.location.search);
      return qs.request
              ? JSON.parse(qs.request);
              : null;
    });

    let accounts = computed(() => {
      let qs = queryString.parse(global.location.search);
      return qs.accounts
              ? JSON.parse(qs.accounts);
              : [];
    });

    let existingLinks = computed(() => {
      let qs = queryString.parse(global.location.search);
      return qs.existingLinks
              ? JSON.parse(qs.existingLinks);
              : [];
    });
</script>

<template>
    <div v-if="type && request">
      <LinkRequestPopup
        v-if="type === 'link'"
        :request="request"
        :accounts="accounts"
        :existingLinks="existingLinks"
      />
      <ReLinkRequestPopup
        v-else-if="type === 'reLinkReqModal'"
        :request="request"
      />
      <IdentityRequestPopup
        v-else-if="type === 'identityReqModal'"
        :request="request"
      />
      <GenericRequestPopup
        v-else-if="type === 'genericReqModal'"
        :request="request"
      />
      <SignMessageRequestPopup
        v-else-if="type === 'signMessageModal'"
        :request="request"
      />
      <TransferRequestPopup
        v-else-if="type === 'transferReqModal'"
        :request="request"
      />
      <TransactionRequestPopup
        v-else-if="type === 'transactionReqModal'"
        :request="request"
      />
    </div>
    <div v-else>
        Error: Unable to load prompt.
    </div>
</template>
