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

    let modalType = ref(queryString.parse(location.search));
    //let alerts = ref([]);
    //let loaderpromise = ref({});
    //let dismissCountDown = ref(0);
    //let transientMsg = ref('');
    //let transientLink = ref('');

    /*
    this.emitter.on("popup", async what => {
        switch (what) {
        case "load-start":
            loaderpromise.value.show = new Promise(resolve => {
                //this.$refs.loaderAnimModal.show();
                loaderpromise.value.resolve = resolve;
            });
            break;
        case "load-end":
            await loaderpromise.value.show;
            //this.$refs.loaderAnimModal.hide();
            break;
        }
    });

    this.emitter.on("tx-success", (data) => {
        dismissCountDown.value = 5;
        transientMsg.value = data.msg;
        transientLink.value = data.link;
    });


    watchEffect(() => $route() {
        alerts.value = [];
    });
    */

    onMounted() {
        logger.debug("Modal mounted");
    }
</script>

<template>
    <div>
        <LinkRequestPopup
          v-if="modalType.type === 'linkReqModal'"
          ref="linkReqModal"
        />
        <ReLinkRequestPopup
          v-else-if="modalType.type === 'reLinkReqModal'"
          ref="reLinkReqModal"
        />
        <IdentityRequestPopup
          v-else-if="modalType.type === 'identityReqModal'"
          ref="identityReqModal"
        />
        <SignMessageRequestPopup
          v-else-if="modalType.type === 'signMessageModal'"
          ref="signMessageModal"
        />
        <TransferRequestPopup
          v-else-if="modalType.type === 'transferReqModal'"
          ref="transferReqModal"
        />
        <TransactionRequestPopup
          v-else-if="modalType.type === 'transactionReqModal'"
          ref="transactionReqModal"
        />
        <GenericRequestPopup
          v-else-if="modalType.type === 'genericReqModal'"
          ref="genericReqModal"
        />
    </div>
</template>
