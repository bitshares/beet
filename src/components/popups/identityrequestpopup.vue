<script setup>
    import { ipcRenderer } from 'electron';
    import { onMounted, computed } from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    const props = defineProps({
      request: Object,
      accounts: Array
    });

    let account_id = computed(() => {
      return prop.accounts[0].account_id;
    });

    let accountName = computed(() => {
      return prop.accounts[0].accountName;
    });

    let chain = computed(() => {
      return prop.accounts[0].chain;
    });

    let requestText = computed(() => {
      return t(
        'operations.account_id.request',
        {
          appName: props.request.appName,
          origin: props.request.origin,
          chain: chain,
          accountId: account_id,
          accountName: accountName
        }
      );
    });

    onMounted(() => {
      logger.debug("Link Popup initialised");
    });

    function _clickedAllow() {
        ipcRenderer.send("clickedAllow", {
          response: {
              name: accountName,
              chain: chain,
              id: account_id
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
