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
        {{ $t('operations:account_id.request', {appName: incoming.appName,origin: incoming.origin, chain: incoming.chain }) }}
        <br>
        <br>
        <AccountSelect
                v-model="chosenAccount"
                :chain="incoming.chain"
                :cta="$t('operations:account_id.request_cta')"
        />
        <b-btn
                class="mt-3"
                variant="success"
                block
                @click="_clickedAllow"
        >
            {{ $t('operations:account_id.accept_btn') }}
        </b-btn>
        <b-btn
                class="mt-1"
                variant="danger"
                block
                @click="_clickedDeny"
        >
            {{ $t('operations:account_id.reject_btn') }}
        </b-btn>
    </b-modal>
</template>
<script>
    // operations:any_account_id.request
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