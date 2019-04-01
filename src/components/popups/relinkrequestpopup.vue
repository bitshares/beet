<template>
    <b-modal
        id="type"
        ref="modalComponent"
        centered
        no-close-on-esc
        no-close-on-backdrop
        hide-header-close
        hide-footer
        :title="$t('operations:account_id.title')"
    >
        <div
            v-b-tooltip.hover
            :title="$t('operations:relink.request_tooltip')"
        >
            {{ $t('operations:relink.request', {appName: incoming.appName, origin: incoming.origin, chain: incoming.chain, accountId: incoming.account_id }) }} &#10068;
        </div>
        <br>
        <b-btn
            class="mt-3"
            variant="success"
            block
            @click="_clickedAllow"
        >
            {{ $t('operations:link.accept_btn') }}
        </b-btn>
        <b-btn
            class="mt-1"
            variant="danger"
            block
            @click="_clickedDeny"
        >
            {{ $t('operations:link.reject_btn') }}
        </b-btn>
    </b-modal>
</template>
<script>
    import AbstractPopup from "./abstractpopup";
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    export default {
        name: "ReLinkRequestPopup",
        components: {},
        extends: AbstractPopup,
        data() {
            return {
                type: "ReLinkRequestPopup",
                chosenAccount: { trackId: 0 }
            };
        },
        mounted() {
            logger.debug("Relink Popup initialised");
        },
        methods: {
            _onShow: function() {
                this.error = false;
                console.log(this.incoming);
            },
            _execute: function() {
                let apps = this.$store.state.OriginStore.apps.filter(
                    x => x.identityhash == this.incoming.payload.identityhash
                );
                if (apps.length == 1) {
                    let app = apps[0];
                    let account = this.$store.state.AccountStore.accountlist.filter(
                        x => x.accountId == app.account_id && x.chain == app.chain
                    );
                    return {
                        identityhash: this.incoming.payload.identityhash,
                        name: account.accountName,
                        chain: app.chain,
                        id: app.account_id
                    };
                }
            }
        }
    };
</script> 