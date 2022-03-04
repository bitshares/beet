<script setup>
    import { ref, onMounted } from "vue";

    import AbstractPopup from "./abstractpopup";
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    let type = ref("IdentityRequestPopup");
    let beetapp = ref({});
    let idaccount = ref({});

    onMounted(() => {
      logger.debug("Link Popup initialised");
    });

    function _onShow() {
        let shownBeetApp = this.$store.state.OriginStore.apps.filter(
            x => x.identityhash == incoming.identityhash
        )[0];

        idaccount.value = this.$store.state.AccountStore.accountlist.filter(
            x => {  return  x.accountID == shownBeetApp.account_id && x.chain == shownBeetApp.chain; }
        )[0];

        beetapp.value = shownBeetApp;
    }

    function _execute() {
        return {
            name: idaccount.value.accountName,
            chain: beetapp.value.chain,
            id: beetapp.value.account_id
        };
    }
</script>

<template>
    <b-modal
        id="type"
        ref="modalComponent"
        class="linkStyle"
        centered
        no-close-on-esc
        no-close-on-backdrop
        hide-header-close
        hide-footer
        :title="$t('operations.account_id.title')"
    >
        <div
            v-b-tooltip.hover
            :title="$t('operations.identity.request_tooltip')"
        >
            {{ $t('operations.account_id.request', {appName: incoming.appName, origin: incoming.origin, chain: incoming.chain, accountId: beetapp.account_id, accountName: idaccount.accountName }) }} &#10068;
        </div>
        <b-btn
            class="mt-3"
            variant="success"
            block
            @click="_clickedAllow"
        >
            {{ $t('operations.account_id.accept_btn') }}
        </b-btn>
        <b-btn
            class="mt-1"
            variant="danger"
            block
            @click="_clickedDeny"
        >
            {{ $t('operations.account_id.reject_btn') }}
        </b-btn>
    </b-modal>
</template>
