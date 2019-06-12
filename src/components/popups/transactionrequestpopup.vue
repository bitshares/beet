<template>
    <b-modal
        id="type"
        ref="modalComponent"
        centered
        no-close-on-esc
        no-close-on-backdrop
        hide-header-close
        hide-footer
        :title="$t('operations:rawsig.title')"
    >
        {{ $t('operations:rawsig.request',
              { appName: incoming.appName,
                origin: incoming.origin,
                chain: incoming.chain,
                accountName: incoming.account_id
              }
        )
        }}
        <br>
        <br>
        <div
            v-if="!!incoming.visualized"
            class="text-left custom-content"
            v-html="incoming.visualized"
        />
        <pre
            v-else-if="!!incoming.params"
            class="text-left custom-content"
        >
<code>
{
{{ incoming.params }}
}
</code>
        </pre>
        {{ $t('operations:rawsig.request_cta') }}
        <b-btn
            class="mt-3"
            variant="success"
            block
            @click="_clickedAllow"
        >
            {{ incoming.params && incoming.params.length > 0 && incoming.params[0] == "sign" ? $t('operations:rawsig.sign_btn') : $t('operations:rawsig.sign_and_broadcast_btn') }}
        </b-btn>
        <b-btn
            class="mt-1"
            variant="danger"
            block
            @click="_clickedDeny"
        >
            {{ $t('operations:rawsig.reject_btn') }}
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
        name: "TransactionRequestPopup",
        extends: AbstractPopup,
        data() {
            return {
                type: "TransactionRequestPopup",
                incoming: {
                    signingAccount: {},
                    visualized: null
                }
            };
        },
        mounted() {
            logger.debug("Tx Popup initialised");
        },
        methods: {
            _onShow() {
                getBlockchain(this.incoming.chain).visualize(this.incoming.params).then(result => {
                    this.incoming.visualized = result;
                    this.incoming = Object.assign({}, this.incoming);
                });
            },
            getSuccessNotification(result) {
                return {msg: 'Transaction successfully broadcast.', link: '' };
            },
            _execute: async function () {
                let blockchain = getBlockchain(this.incoming.chain);
                if (this.incoming.params[0] == "sign") {
                    let tr = await blockchain.sign(
                        this.incoming.params,
                        await getKey(this.$store.getters['AccountStore/getSigningKey'](this.incoming).keys.active)
                    );
                    return tr.toObject();
                } else if (this.incoming.params[0] == "broadcast") {
                    return await blockchain.broadcast(this.incoming.params);
                } else if (this.incoming.params[0] == "signAndBroadcast") {
                    let transaction = await blockchain.sign(
                        this.incoming.params,
                        await getKey(this.$store.getters['AccountStore/getSigningKey'](this.incoming).keys.active)
                    );
                    return await blockchain.broadcast(transaction);
                }
            }
        }
    };
</script>
