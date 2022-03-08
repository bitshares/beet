<script setup>
    import { ref, onMounted, computed } from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import AccountSelect from "../account-select";
    import store from '../store/index';
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    let type = ref("LinkRequestPopup");
    let chosenAccount = ref({trackId: 0});

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

    onMounted() {
      logger.debug("Link Popup initialised");
      store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
    }

    let existingLinks = computed(() => {
      return store.state.OriginStore.apps.filter(
          (x) => {
              return x.appName == incoming.value.appName
                  && x.origin == incoming.value.origin
                  && incoming.value.chain == "ANY" || x.chain == incoming..valuechain
          }
      );
    });

    async function _clickedAllow() {

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

        try {
            // todo allowWhitelist move whitelisting to BeetAPI, thus return flag here
            _accept.value(
                {
                    response: {
                        name: chosenAccount.value.accountName,
                        chain: chosenAccount.value.chain,
                        id: chosenAccount.value.accountID
                    },
                    whitelisted: allowWhitelist.value
                }
            );
        } catch (error) {
            console.log(error);
            _reject.value({ error: error });
            ipcRenderer.send("modalError", true);
        }
    }

    function _clickedDeny() {
        _reject.value({ canceled: true });
        ipcRenderer.send("clickedDeny", true);
    }
</script>


<template>
    <div v-tooltip="t('operations.link.request_tooltip')">
        {{
          t(
            'operations.link.request',
            {appName: incoming.appName, origin: incoming.origin, chain: incoming.chain }
          )
        }} &#10068;
    </div>
    <br>
    <div v-if="existingLinks.length > 0">
        {{ t('operations.link.request_fresh', {chain: incoming.chain }) }}
    </div>
    <br>
    <AccountSelect
        v-if="incoming.chain"
        v-model="chosenAccount"
        :chain="incoming.chain"
        :existing="existingLinks"
        :cta="t('operations.link.request_cta')"
        extraclass="accountProvide"
    />
    <div v-if="!chosenAccount.trackId == 0">
      <ui-button raised @click="_clickedAllow">
          {{ t('operations.link.accept_btn') }}
      </ui-button>
      <ui-button raised @click="_clickedDeny">
          {{ t('operations.link.reject_btn') }}
      </ui-button>
    </div>
    <div v-else>
      <ui-button raised @click="_clickedDeny">
          {{ t('operations.link.reject_btn') }}
      </ui-button>
    </div>
</template>
