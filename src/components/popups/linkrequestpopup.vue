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
            :title="$t('operations:link.request_tooltip')"
        >
            {{ $t('operations:link.request', {appName: incoming.appName, origin: incoming.origin, chain: incoming.chain }) }} &#10068;
        </div>
        <br>
        <AccountSelect
            v-model="chosenAccount"
            :chain="incoming.chain"
            :cta="$t('operations:link.request_cta')"
        />
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
    import AccountSelect from "../account-select";
    const logger = new RendererLogger();

    export default {
        name: "LinkRequestPopup",
        extends: AbstractPopup,
        components: { AccountSelect },
        data() {
            return {
                type: "LinkRequestPopup",
                chosenAccount: {},
            };
        },
        methods: {
            _execute: function () {
                return {
                    name: this.chosenAccount.accountName,
                    chain: this.chosenAccount.chain,
                    id: this.chosenAccount.accountID
                };
            }
        }
    };
</script> 