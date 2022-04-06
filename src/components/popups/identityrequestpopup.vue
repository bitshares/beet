<script setup>
    import { ipcRenderer } from 'electron';
    import { ref, onMounted } from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    const props = defineProps({
      request: Object
    });

    let type = ref("IdentityRequestPopup");
    let allowWhitelist = ref(false);
    let beetapp = ref({});
    let idaccount = ref({});

    let incoming = ref({});
    let requestText = ref('Loading identity request');

    onMounted(() => {
      logger.debug("Link Popup initialised");
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
        ipcRenderer.send("clickedAllow", {
          response: {
              name: idaccount.value.accountName,
              chain: beetapp.value.chain,
              id: beetapp.value.account_id
          },
          request: {id: props.request.id}
        });
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
    <div v-tooltip="t('operations.identity.request_tooltip')">
        {{ requestText }} &#10068;
    </div>
    <ui-button raised @click="_clickedAllow()">
        {{ t('operations.account_id.accept_btn') }}
    </ui-button>
    <ui-button raised @click="_clickedDeny()">
        {{ t('operations.account_id.reject_btn') }}
    </ui-button>
</template>
