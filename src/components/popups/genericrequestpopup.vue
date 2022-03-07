<script setup>
    import { ref, onMounted } from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import getBlockchain from "../../lib/blockchains/blockchainFactory";
    import {getKey} from '../../lib/SecureRemote';
    import store from '../store/index';

    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    let error = ref(false);
    let type = ref("GenericRequestPopup");
    let incoming = ref({generic: {}});
    let api = ref(null);
    let askWhitelist = ref(false);
    let allowWhitelist = ref(false);

    let _accept = ref(null);
    let _reject = ref(null);

    onMounted(() => {
      logger.debug("Req Popup initialised");
      store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
    });

    /////////

    async function show(incoming, newWhitelist = null) {
        incoming.value = incoming;
        if (newWhitelist !== null) {
            askWhitelist.value = newWhitelist;
        }
        //this.$refs.modalComponent.show();
        return new Promise((resolve, reject) => {
            _accept.value = resolve;
            _reject.value = reject;
        });
    }

    function getSuccessNotification(res) {
        return false;
    }

    async function  _execute() {
        if (incoming.value.acceptCall) {
            return incoming.value.acceptCall();
        }

        let blockchain = getBlockchain(incoming.value.chain);
        let operation;
        try {
          operation = await blockchain.getOperation(incoming.value, _getLinkedAccount());
        } catch (error) {
          console.log(error);
          return;
        }

        if (operation.nothingToDo) {
          return {msg: "Already done, no action needed"}
        }

        let signingKey;
        try {
          signingKey = await getKey(store.getters['AccountStore/getSigningKey'](incoming.value).keys.active);
        } catch (error) {
          console.log(error);
          return;
        }

        let transaction;
        try {
          transaction = await blockchain.sign(operation, signingKey);
        } catch (error) {
          console.log(error);
          return;
        }

        let returnValue;
        try {
          returnValue = await blockchain.broadcast(transaction);
        } catch (error) {
          console.log(error);
          return;
        }

        if (allowWhitelist.value) {
            // todo: allowWhitelist move whitelisting into BeetAPI
            store.dispatch(
                "WhitelistStore/addWhitelist",
                {
                    identityhash: incoming.value.identityhash,
                    method: 'signMessage'
                }
            );
        }
        
        return returnValue;
    }

    async function _clickedAllow() {
        // this.emitter.emit("popup", "load-start");
        // this.emitter.emit("popup", "load-end");
        //this.$refs.modalComponent.hide();
        try {
            let result = await _execute();
            let notification = getSuccessNotification(result);
            if (notification) {
                this.emitter.emit("tx-success", notification);
            }
            // todo allowWhitelist move whitelisting to BeetAPI, thus return flag here
            _accept.value(
                {
                    response: result,
                    whitelisted: allowWhitelist.value
                }
            );
            if (allowWhitelist.value) {
                // todo: allowWhitelist move whitelisting into BeetAPI
                store.dispatch(
                    "WhitelistStore/addWhitelist",
                    {
                        identityhash: incoming.value.identityhash,
                        method: type.value
                    }
                );
            }
        } catch (err) {
            _reject.value({ error: err });
        }
    }

    function _clickedDeny() {
        //this.$refs.modalComponent.hide();
        _reject.value({ canceled: true });
    }

    function _getLinkedAccount() {
        let account = store.getters['AccountStore/getSigningKey'](incoming.value);
        return {
            id: account.accountID,
            name: account.accountName,
            chain: account.chain
        }
    }

    /////////

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
