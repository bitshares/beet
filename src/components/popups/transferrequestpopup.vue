<template>
    <b-modal
        id="type"
        ref="modalComponent"
        centered
        no-close-on-esc
        no-close-on-backdrop
        hide-header-close
        hide-footer
        :title="$t('operations:transfer.title')"
    >
        {{ message }}:
        <br>
        <br>
        <pre class="text-left custom-content"><code>
    Recipient: {{ to }}
    Amount: {{ satoshis }} {{ asset_id }}
        </code></pre>
        <b-btn
            class="mt-3"
            variant="success"
            block
            @click="_clickedAllow"
        >
            {{ $t("operations:transfer.accept_btn") }}
        </b-btn>
        <b-btn
            class="mt-1"
            variant="danger"
            block
            @click="_clickedDeny"
        >
            {{ $t("operations:transfer.reject_btn") }}
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
        name: "TransferRequestPopup",
        extends: AbstractPopup,
        data() {
            return {
                type: "TransferRequestPopup",
                askWhitelist: false,
                message: null,
                recipient: null,
                satoshis: null,
                asset_id: null
            };
        },
        methods: {
            _onShow() {
                this.message = this.$t("operations:message.request", {
                    appName: this.incoming.appName,
                    origin: this.incoming.origin,
                    chain:   this.$store.getters['AccountStore/getSigningKey'](this.incoming).chain,
                    accountName:   this.$store.getters['AccountStore/getSigningKey'](this.incoming).accountName
                });
                this.to = this.incoming.params.to;
                this.satoshis = this.incoming.params.amount.satoshis;
                this.asset_id = this.incoming.params.amount.asset_id;
            },
            _execute: async function () {
                let blockchain = getBlockchain(this.incoming.chain);

                if (!this.incoming.params.amount) {
                    this.incoming.params.amount = this.incoming.params.satoshis;
                }

                return await blockchain.transfer(
                    await getKey(this.$store.getters['AccountStore/getSigningKey'](this.incoming).keys.active),
                    this.$store.getters['AccountStore/getSigningKey'](this.incoming).accountName,
                    this.incoming.params.to,
                    {
                        amount: this.incoming.params.amount.satoshis || this.incoming.params.amount.amount,
                        asset_id: this.incoming.params.amount.asset_id
                    },
                    this.incoming.params.memo,
                );
            }
        }
    };
</script> 