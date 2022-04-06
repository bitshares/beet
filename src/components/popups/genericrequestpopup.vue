<script setup>
    import { ipcRenderer } from 'electron';
    import { ref, onMounted, onBeforeMount, inject } from "vue";

    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import getBlockchainAPI from "../../lib/blockchains/blockchainFactory";
    import {getKey} from '../../lib/SecureRemote';

    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    const props = defineProps({
      request: Object
    });

    let type = ref("GenericRequestPopup");

    let allowWhitelist = ref(false);

    let acceptText = ref(null);
    let rejectText = ref(null);

    onMounted(() => {
      logger.debug("Req Popup initialised");
      store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});

      acceptText.value = props.request.generic.acceptText || t('operations.rawsig.accept_btn');
      rejectText.value = props.request.generic.rejectText || t('operations.rawsig.reject_btn');
    });

    /////////
    function _getLinkedAccount() {
        let account = store.getters['AccountStore/getSigningKey'](props.request);
        return {
            id: account.accountID,
            name: account.accountName,
            chain: account.chain
        }
    }

    async function _clickedAllow() {
        let blockchain = getBlockchainAPI(props.request.chain);
        let operation;
        try {
          operation = await blockchain.getOperation(props.request, _getLinkedAccount());
        } catch (error) {
          console.log(error);
          ipcRenderer.send("modalError", true);
        }

        if (operation.nothingToDo) {
          _accept.value({msg: "Already done, no action needed"});
          ipcRenderer.send(
              "clickedAllow",
              {
                response: {
                    name: approvedAccount.accountName,
                    chain: approvedAccount.chain,
                    id: approvedAccount.accountID
                },
                request: {
                  id: props.request.id
                },
                whitelisted: allowWhitelist.value
            }
          );
        }

        let signingKey;
        try {
          signingKey = await getKey(store.getters['AccountStore/getSigningKey'](props.request).keys.active);
        } catch (error) {
          console.log(error);
          ipcRenderer.send("modalError", true);
        }

        let transaction;
        try {
          transaction = await blockchain.sign(operation, signingKey);
        } catch (error) {
          console.log(error);
          ipcRenderer.send("modalError", true);
        }

        let result;
        try {
          result = await blockchain.broadcast(transaction);
        } catch (error) {
          console.log(error);
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
                        identityhash: props.request.identityhash,
                        method: 'signMessage'
                    }
                );
                store.dispatch(
                    "WhitelistStore/addWhitelist",
                    {
                        identityhash: props.request.identityhash,
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
        ipcRenderer.send(
          "clickedDeny",
          {
            response: {canceled: true},
            request: {id: props.request.id}
          }
        );
    }

</script>

<template>
  <div v-if="_accept">
    {{ incoming.generic.message }}:
    <br>
    <br>
    <pre class="text-left custom-content"><code>{{ incoming.generic.details }}</code></pre>

    <ui-button raised @click="_clickedAllow()">
      {{ acceptText }}
    </ui-button>

    <ui-button outlined @click="_clickedDeny()">
      {{ rejectText }}
    </ui-button>
  </div>
  <div v-else>
    Loading beet modal contents
  </div>
</template>
