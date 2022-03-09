<script setup>
    import {ref, onMounted} from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import store from '../store/index';
    import {getKey} from '../../lib/SecureRemote';
    import getBlockchain from "../../lib/blockchains/blockchainFactory";
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    let type = ref("SignMessageRequestPopup");
    let askWhitelist = ref(false);
    let message = ref(null);

    let incoming = ref({});
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
      logger.debug("Signed message popup initialised");
      store.dispatch("WalletStore/notifyUser", {notify: "request", message: message}); //show alert instead?

      message.value = t("operations.message.request", {
          appName: incoming.value.appName,
          origin: incoming.value.origin,
          chain: store.getters['AccountStore/getSigningKey'](incoming.value).chain,
          accountName: store.getters['AccountStore/getSigningKey'](incoming.value).accountName
      });
    });

    /*
    async function show(incoming, newWhitelist = null) {
        if (newWhitelist !== null) {
            askWhitelist.value = newWhitelist;
        }
    }
    */

    async function _clickedAllow() {
        let keys = store.getters['AccountStore/getSigningKey'](incoming.value).keys;

        let key;
        try {
          key = await getKey(keys.memo ?? keys.active)
        } catch (error) {
          console.log(error);
          _reject.value({ error: error });
          ipcRenderer.send("modalError", true);
        }

        let blockchain = getBlockchain(incoming.value.chain);
        let signingKey;
        try {
          signingKey = store.getters['AccountStore/getSigningKey'](incoming.value).accountName;
        } catch (error) {
          console.log(error);
          _reject.value({ error: error });
          ipcRenderer.send("modalError", true);
        }

        let signedMessage;
        try {
          signedMessage = await blockchain.signMessage(key, signingKey, incoming.value.params);
        } catch (error) {
          console.log(error);
          _reject.value({ error: error });
          ipcRenderer.send("modalError", true);
        }

        ipcRenderer.send("notify", 'Message successfully signed.');
        try {
            // todo allowWhitelist move whitelisting to BeetAPI, thus return flag here
            _accept.value({response: signedMessage, whitelisted: allowWhitelist.value});

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
          console.log(error);
          _reject.value({ error: error });
          ipcRenderer.send("modalError", true);
        }
        ipcRenderer.send("clickedAllow", true);
    }

    function _clickedDeny() {
        ipcRenderer.send("clickedDeny", true);
        _reject.value({ canceled: true });
    }
</script>

<template>
    {{ message }}:
    <br>
    <br>
    <pre class="text-left custom-content"><code>{{ incoming.params }}</code></pre>
    <ui-form-field v-if="askWhitelist">
      <ui-checkbox v-model="allowWhitelist" input-id="allowWhitelist"></ui-checkbox>
      <label>{{ t('operations.whitelist.prompt', { method: incoming.method }) }}</label>
    </ui-form-field>
    <ui-button raised @click="_clickedAllow">
        {{ t("operations.message.accept_btn") }}
    </ui-button>
    <ui-button raised @click="_clickedDeny">
        {{ t("operations.message.reject_btn") }}
    </ui-button>
</template>
