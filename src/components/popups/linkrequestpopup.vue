<script setup>
    import { ipcRenderer } from 'electron';
    import { ref, onMounted, computed, onBeforeMount } from "vue";

    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import AccountSelect from "../account-select";
    import store from '../../store/index';
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    let chosenAccount = ref({trackId: 0});
    let incoming = ref({});
    let allowWhitelist = ref(false);

    let requestText = ref('');
    let secondText = ref('');

    onBeforeMount(() => {
      ipcRenderer.invoke("getRequest", true)
        .then(request => {
          incoming.value = request;
        })
        .catch(error => {
          console.log(error)
        });
    });

    onMounted(() => {
      logger.debug("Link Popup initialised");
      store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
      requestText.value = t(
        'operations.link.request',
        {appName: incoming.appName, origin: incoming.origin, chain: incoming.chain }
      );
      secondText.value = t('operations.link.request_fresh', {chain: incoming.chain });
    })

    let existingLinks = computed(() => {
      return store.state.OriginStore.apps.filter(
          (x) => {
              return x.appName == incoming.value.appName
                  && x.origin == incoming.value.origin
                  && incoming.value.chain == "ANY" || x.chain == incoming.value.chain
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
                    method: "LinkRequestPopup"
                }
            );
        }

        if (!chosenAccount.value) {
          ipcRenderer.send("modalError", 'No chosen account');
        }

        ipcRenderer.send(
            "clickedAllow",
            {
              response: {
                  name: chosenAccount.value.accountName,
                  chain: chosenAccount.value.chain,
                  id: chosenAccount.value.accountID
              },
              whitelisted: allowWhitelist.value
          }
        );
    }

    function _clickedDeny() {
        ipcRenderer.send("clickedDeny", true);
    }
</script>


<template>
    <div v-tooltip="t('operations.link.request_tooltip')">
        {{ requestText }} &#10068;
    </div>
    <br>
    <div v-if="existingLinks.length > 0">
        {{ secondText }}
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
