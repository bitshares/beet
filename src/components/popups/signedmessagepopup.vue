<template>
    <b-modal
        id="type"
        ref="modalComponent"
        centered
        no-close-on-esc
        no-close-on-backdrop
        hide-header-close
        hide-footer
        :title="$t('operations:message.title')"
    >
        {{ message }}:
        <br>
        <br>
        <pre class="text-left custom-content"><code>{{ incoming.params }}</code></pre>
        <b-form-checkbox
            v-if="askWhitelist"
            v-model="allowWhitelist"
        >
            {{ $t('operations:whitelist.prompt', { method: incoming.method }) }}
        </b-form-checkbox>
        <b-btn
            class="mt-3"
            variant="success"
            block
            @click="_clickedAllow"
        >
            {{ $t("operations:message.accept_btn") }}
        </b-btn>
        <b-btn
            class="mt-1"
            variant="danger"
            block
            @click="_clickedDeny"
        >
            {{ $t("operations:message.reject_btn") }}
        </b-btn>
    </b-modal>
</template>
<script>
    import AbstractPopup from "./abstractpopup";
    import RendererLogger from "../../lib/RendererLogger";
    import getBlockchain from "../../lib/blockchains/blockchainFactory";
    const logger = new RendererLogger();
    import {getKey} from '../../lib/SecureRemote';

    export default {
        name: "SignMessageRequestPopup",
        extends: AbstractPopup,
        data() {
            return {
                type: "SignMessageRequestPopup",
                askWhitelist: false,
                message: null
            };
        },
        methods: {
            _onShow() {
                this.message = this.$t("operations:message.request", {
                    appName: this.incoming.appName,
                    origin: this.incoming.origin,
                    chain: this.$store.getters['AccountStore/getSigningKey'](this.incoming).chain,
                    accountName: this.$store.getters['AccountStore/getSigningKey'](this.incoming).accountName
                });
            },
            getSuccessNotification(result) {
                return {msg: 'Message successfully signed.', link: '' };
            },
            _execute: async function () {
                let blockchain = getBlockchain(this.incoming.chain);

                let keys = this.$store.getters['AccountStore/getSigningKey'](this.incoming).keys;

                let signatureKey = null;
                if (keys.memo) {
                    signatureKey = keys.memo;
                } else {
                    signatureKey = keys.active;
                }

                return await blockchain.signMessage(
                    await getKey(signatureKey),
                    this.$store.getters['AccountStore/getSigningKey'](this.incoming).accountName,
                    this.incoming.params
                );
            }
        }
    };
</script>
