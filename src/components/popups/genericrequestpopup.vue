<script setup>
    import { ipcRenderer } from 'electron';
    import { ref, onMounted, onBeforeMount, inject } from "vue";

    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import getBlockchain from "../../lib/blockchains/blockchainFactory";
    import {getKey} from '../../lib/SecureRemote';
    import store from '../store/index';

    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    let type = ref("GenericRequestPopup");
    let incoming = ref({generic: {}});
    let allowWhitelist = ref(false);

    let acceptText = ref(null);
    let rejectText = ref(null);

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

      acceptText.value = incoming.generic.acceptText || t('operations.rawsig.accept_btn');
      rejectText.value = incoming.generic.rejectText || t('operations.rawsig.reject_btn');
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
        if (incoming.value.acceptCall) {
            // ipcRenderer.send("clickedAllow", true); // return without cutting off acceptcall code?
            return incoming.value.acceptCall();
        }

        let blockchain = getBlockchain(incoming.value.chain);
        let operation;
        try {
          operation = await blockchain.getOperation(incoming.value, _getLinkedAccount());
        } catch (error) {
          console.log(error);
          _reject.value({ error: error });
          ipcRenderer.send("modalError", true);
        }

        if (operation.nothingToDo) {
          _accept.value({msg: "Already done, no action needed"});
          ipcRenderer.send("clickedAllow", true);
        }

        let signingKey;
        try {
          signingKey = await getKey(store.getters['AccountStore/getSigningKey'](incoming.value).keys.active);
        } catch (error) {
          console.log(error);
          _reject.value({ error: error });
          ipcRenderer.send("modalError", true);
        }

        let transaction;
        try {
          transaction = await blockchain.sign(operation, signingKey);
        } catch (error) {
          console.log(error);
          _reject.value({ error: error });
          ipcRenderer.send("modalError", true);
        }

        let result;
        try {
          result = await blockchain.broadcast(transaction);
        } catch (error) {
          console.log(error);
          _reject.value({ error: error });
          ipcRenderer.send("modalError", true);
        }

        try {
            // todo allowWhitelist move whitelisting to BeetAPI, thus return flag here
            _accept.value({response: result, whitelisted: allowWhitelist.value});

            if (allowWhitelist.value) {
                // todo: allowWhitelist move whitelisting into BeetAPI
                store.dispatch(
                    "WhitelistStore/addWhitelist",
                    {
                        identityhash: incoming.value.identityhash,
                        method: 'signMessage'
                    }
                );
                store.dispatch(
                    "WhitelistStore/addWhitelist",
                    {
                        identityhash: incoming.value.identityhash,
                        method: type.value
                    }
                );
            }
        } catch (error) {
            console.log(error);
            _reject.value({ error: error });
            ipcRenderer.send("modalError", true);
        }

        ipcRenderer.send("clickedAllow", true);
    }

    function _clickedDeny() {
        _reject.value({ canceled: true });
        ipcRenderer.send("clickedDeny", true);
    }

</script>

<template>
  <div v-if="_accept">
    {{ incoming.generic.message }}:
    <br>
    <br>
    <pre class="text-left custom-content"><code>{{ incoming.generic.details }}</code></pre>

    <ui-button raised @click="_clickedAllow">
      {{ acceptText }}
    </ui-button>

    <ui-button outlined @click="_clickedDeny">
      {{ rejectText }}
    </ui-button>
  </div>
  <div v-else>
    Loading beet modal contents
  </div>
</template>
