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
<script>
    import AbstractPopup from "./abstractpopup";
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    export default {
        name: "IdentityRequestPopup",
        components: {},
        extends: AbstractPopup,
        data() {
            return {
                type: "IdentityRequestPopup",
                beetapp: {},
                idaccount: {}
            };
        },
        computed: {},
        mounted() {
            logger.debug("Link Popup initialised");
        },
        methods: {
            _onShow: function() {

                let beetapp = this.$store.state.OriginStore.apps.filter(
                    x => x.identityhash == this.incoming.identityhash
                )[0];

                this.idaccount = this.$store.state.AccountStore.accountlist.filter(
                    x => {  return  x.accountID == beetapp.account_id && x.chain == beetapp.chain; }
                )[0];
                this.beetapp=beetapp;
            },
            _execute: function() {
                return {
                    name: this.idaccount.accountName,
                    chain: this.beetapp.chain,
                    id: this.beetapp.account_id
                };
            }
        }
    };
</script>
