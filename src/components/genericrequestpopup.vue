<template>
    <b-modal
        id="type"
        ref="modalComponent"
        centered
        no-close-on-esc
        no-close-on-backdrop
        hide-header-close
        hide-footer
        :title="incoming.generic.title"
    >
        {{ incoming.generic.message }}:
        <br>
        <br>
        <pre class="text-left custom-content"><code>{{ incoming.generic.details }}</code></pre>
        <b-form-checkbox v-model="allowWhitelist" v-if="askWhitelist">  {{ $t('operations:whitelist.prompt', { method: incoming.method }) }}</b-form-checkbox>
        <b-btn
                class="mt-3"
                variant="success"
                block
                @click="_clickedAllow"
        >
            {{ incoming.generic.acceptText || $t('operations:rawsig.accept_btn') }}
        </b-btn>
        <b-btn
                class="mt-1"
                variant="danger"
                block
                @click="_clickedDeny"
        >
            {{ incoming.generic.rejectText || $t('operations:rawsig.reject_btn') }}
        </b-btn>
    </b-modal>
</template>
<script>
    import AbstractPopup from "./abstractpopup";
    import RendererLogger from "../lib/RendererLogger";
    import getBlockchain from "../lib/blockchains/blockchainFactory";
    const logger = new RendererLogger();

    export default {
        name: "GenericRequestPopup",
        extends: AbstractPopup,
        data() {
            return {
                type: "GenericRequestPopup",
                incoming: {
                    generic: {}
                }
            };
        },
        methods: {
            _getResponse: async function () {
                let returnValue = null;
                if (!!this.incoming.acceptCall) {
                    returnValue = this.incoming.acceptCall();
                } else {
                    let blockchain = getBlockchain(this.incoming.chain);
                    let operation = await blockchain.getOperation(
                        this.incoming,
                        {
                            id: this.incoming.accountID,
                            name: this.incoming.accountName
                        }
                    );
                    let transaction = await blockchain.sign(
                        operation,
                        this.incoming.signingAccount.keys.active
                    );
                    returnValue = await blockchain.broadcast(transaction);
                }
                if (this.allowWhitelist) {
                    // todo: allowWhitelist move whitelisting into BeetAPI
                    this.$store.dispatch(
                        "WhitelistStore/addWhitelist",
                        {
                            identityhash: this.incoming.identityhash,
                            method: 'signMessage'
                        }
                    );
                }
                return returnValue;
            }
        }
    };
</script> 