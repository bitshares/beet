<script setup>
    // import AbstractPopup from "./abstractpopup";
    // extends: AbstractPopup,
    import { onMounted } from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import getBlockchain from "../../lib/blockchains/blockchainFactory";
    import {getKey} from '../../lib/SecureRemote';
    import store from '../store/index';

    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    let type = "GenericRequestPopup";
    let incoming = {generic: {}};

    onMounted(() => {
      logger.debug("Req Popup initialised");
    });

    async function  _execute() {
        let returnValue = null;
        if (this.incoming.acceptCall) {
            returnValue = this.incoming.acceptCall();
        } else {
            let blockchain = getBlockchain(this.incoming.chain);
            let operation = await blockchain.getOperation(
                this.incoming,
                this._getLinkedAccount()
            );
            if (!operation.nothingToDo) {
                let transaction = await blockchain.sign(
                    operation,
                    await getKey(store.getters['AccountStore/getSigningKey'](this.incoming).keys.active)
                );
                returnValue = await blockchain.broadcast(transaction);
            } else {
                returnValue = {
                    msg: "Already done, no action needed"
                }
            }
        }
        if (this.allowWhitelist) {
            // todo: allowWhitelist move whitelisting into BeetAPI
            store.dispatch(
                "WhitelistStore/addWhitelist",
                {
                    identityhash: this.incoming.identityhash,
                    method: 'signMessage'
                }
            );
        }
        return returnValue;
    }
</script>

<template>
    {{ incoming.generic.message }}:
    <br>
    <br>
    <pre class="text-left custom-content"><code>{{ incoming.generic.details }}</code></pre>

    <ui-button raised @click="_clickedAllow">
      {{ incoming.generic.acceptText || t('operations.rawsig.accept_btn') }}
    </ui-button>

    <ui-button outlined @click="_clickedDeny">
      {{ incoming.generic.rejectText || t('operations.rawsig.reject_btn') }}
    </ui-button>
</template>
