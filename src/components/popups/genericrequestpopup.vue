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
    import RendererLogger from "../../lib/RendererLogger";
    import getBlockchain from "../../lib/blockchains/blockchainFactory";
    import {getKey} from '../../lib/SecureRemote';
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
        mounted() {
            logger.debug("Req Popup initialised");
        },
        methods: {
            _execute: async function () {
                let returnValue = null;
                if (this.incoming.acceptCall) {
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
                        await getKey(this.$store.getters['AccountStore/getSigningKey'](this.incoming).keys.active)
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