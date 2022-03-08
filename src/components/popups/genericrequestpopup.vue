<script setup>
    import { ipcRenderer } from 'electron';
    import { ref, onMounted, onBeforeMount, inject } from "vue";
    const emitter = inject('emitter');

    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import getBlockchain from "../../lib/blockchains/blockchainFactory";
    import {getKey} from '../../lib/SecureRemote';
    import store from '../store/index';

    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    //let error = ref(false);
    let type = ref("GenericRequestPopup");
    let incoming = ref({generic: {}});
    //let api = ref(null);
    let allowWhitelist = ref(false);

    let _accept = ref(null);
    let _reject = ref(null);

    onBeforeMount(() => {
      ipcRenderer.send("getContent", true);
      ipcRenderer.on('contentResponse', (event, args) => {
        incoming.value = args.request;
        _accept.value = args._accept;
        _reject.value = args._reject;
      });
    });

    onMounted(() => {
      logger.debug("Req Popup initialised");
      store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
    });

    /////////
    function _getLinkedAccount() {
        let account = store.getters['AccountStore/getSigningKey'](incoming.value);
        return {
            id: account.accountID,
            name: account.accountName,
            chain: account.chain
        }
    }

    async function _clickedAllow() {
        ipcRenderer.send("clickedAllow", true);
        if (incoming.value.acceptCall) {
            return incoming.value.acceptCall();
        }

        let blockchain = getBlockchain(incoming.value.chain);
        let operation;
        try {
          operation = await blockchain.getOperation(incoming.value, _getLinkedAccount());
        } catch (error) {
          console.log(error);
          return _reject.value({ error: error });
        }

        if (operation.nothingToDo) {
          return {msg: "Already done, no action needed"}
        }

        let signingKey;
        try {
          signingKey = await getKey(store.getters['AccountStore/getSigningKey'](incoming.value).keys.active);
        } catch (error) {
          console.log(error);
          return _reject.value({ error: error });
        }

        let transaction;
        try {
          transaction = await blockchain.sign(operation, signingKey);
        } catch (error) {
          console.log(error);
          return _reject.value({ error: error });
        }

        let result;
        try {
          result = await blockchain.broadcast(transaction);
        } catch (error) {
          console.log(error);
          return _reject.value({ error: error });
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

        try {
            // todo allowWhitelist move whitelisting to BeetAPI, thus return flag here
            return _accept.value({response: result, whitelisted: allowWhitelist.value});
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
        } catch (error) {
            return _reject.value({error: error});
        }
    }

    function _clickedDeny() {
        ipcRenderer.send("clickedDeny", true);
        return _reject.value({ canceled: true });
    }
    /////////

</script>

<template>
  <div v-if="_accept">
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
  </div>
  <div v-else>
    Loading popup contents
  </div>
</template>
