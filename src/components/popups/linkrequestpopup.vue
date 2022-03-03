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
            :title="$t('operations.link.request_tooltip')"
        >
            {{ $t('operations.link.request', {appName: incoming.appName, origin: incoming.origin, chain: incoming.chain }) }} &#10068;
        </div>
        <br>
        <div v-if="existingLinks.length>0">
            {{ $t('operations.link.request_fresh', {chain: incoming.chain }) }}
        </div>
        <br>
        <AccountSelect
            v-if="incoming.chain"
            v-model="chosenAccount"
            :chain="incoming.chain"
            :existing="existingLinks"
            :cta="$t('operations.link.request_cta')"
            extraclass="accountProvide"
        />
        <b-btn
            class="mt-3"
            variant="success"
            block
            @click="clickedAllow"
        >
            {{ $t('operations.link.accept_btn') }}
        </b-btn>
        <b-btn
            class="mt-1"
            variant="danger"
            block
            @click="_clickedDeny"
        >
            {{ $t('operations.link.reject_btn') }}
        </b-btn>
    </b-modal>
</template>
<script>
    import AbstractPopup from "./abstractpopup";
    import RendererLogger from "../../lib/RendererLogger";
    import AccountSelect from "../account-select";
    const logger = new RendererLogger();

    export default {
        name: "LinkRequestPopup",
        components: { AccountSelect },
        extends: AbstractPopup,
        data() {
            return {
                type: "LinkRequestPopup",
                chosenAccount: {trackId: 0},
            };
        },
        computed: {
            existingLinks() {
                return this.$store.state.OriginStore.apps.filter(
                    (x) => {
                        return x.appName == this.incoming.appName
                            && x.origin==this.incoming.origin
                            && (
                                this.incoming.chain == "ANY"
                            || x.chain==this.incoming.chain
                            )
                    }
                );
            }
        },
        mounted() {
            logger.debug("Link Popup initialised");
        },
        methods: {
            _onShow: function () {
                this.error=false;
                this.chosenAccount={trackId: 0};
            },
            _execute: function () {
                return {
                    name: this.chosenAccount.accountName,
                    chain: this.chosenAccount.chain,
                    id: this.chosenAccount.accountID
                };
            },
            clickedAllow: function() {
                if (this.chosenAccount.trackId==0) {
                    this.error=true;
                }else{
                    this.error=false;
                    this._clickedAllow();
                }
            }
        }
    };
</script>
