<script setup>
    import { ipcRenderer } from 'electron';
    import { ref, onMounted } from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import store from '../store/index';
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    let type = ref("IdentityRequestPopup");
    let allowWhitelist = ref(false);
    let beetapp = ref({});
    let idaccount = ref({});

    let incoming = ref({});
    let requestText = ref('Loading identity request');
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
      logger.debug("Link Popup initialised");
      store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
      //
      let shownBeetApp = store.state.OriginStore.apps.filter(
          x => x.identityhash == incoming.value.identityhash
      )[0];

      idaccount.value = store.state.AccountStore.accountlist.filter(x => {
        return x.accountID == shownBeetApp.account_id && x.chain == shownBeetApp.chain;
      })[0];

      beetapp.value = shownBeetApp;

      requestText.value = t(
        'operations.account_id.request',
        {
          appName: incoming.value.appName,
          origin: incoming.value.origin,
          chain: incoming.value.chain,
          accountId: beetapp.value.account_id,
          accountName: idaccount.value.accountName
        }
      )
    });

    async function _clickedAllow() {
        try {
            // todo allowWhitelist move whitelisting to BeetAPI, thus return flag here
            _accept.value({
              response: {
                  name: idaccount.value.accountName,
                  chain: beetapp.value.chain,
                  id: beetapp.value.account_id
              },
              whitelisted: allowWhitelist.value
            });

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
        _reject.value({ canceled: true });
        ipcRenderer.send("clickedDeny", true);
    }
</script>

<template>
    <div v-tooltip="t('operations.identity.request_tooltip')">
        {{ requestText }} &#10068;
    </div>
    <ui-button raised @click="_clickedAllow">
        {{ t('operations.account_id.accept_btn') }}
    </ui-button>
    <ui-button raised @click="_clickedDeny">
        {{ t('operations.account_id.reject_btn') }}
    </ui-button>
</template>
