<script setup>
    import { ipcRenderer } from 'electron';
    import { onMounted, computed} from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    const props = defineProps({
      request: Object,
      accounts: Array
    });

    let requestText = computed(() => {
        return t(
          'operations.relink.request',
          {
            appName: props.request.appName,
            origin: props.request.origin,
            chain: props.request.chain,
            accountId: props.accounts[0].accountID
          }
        );
    });

    onMounted(() => {
      logger.debug("Relink Popup initialised");
    });

    function _clickedAllow() {
        ipcRenderer.send(
            "clickedAllow",
            {
              response: {
                  identityhash: props.request.payload.identityhash,
                  name: props.accounts[0].accountName,
                  chain: props.accounts[0].chain,
                  id: props.accounts[0].accountID,
                  success: true
              },
              request: {
                id: props.request.id
              }
          }
        );
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
    <div v-tooltip="t('operations.relink.request_tooltip')">
        {{ requestText }} &#10068;
    </div>
    <br>
    <ui-button raised @click="_clickedAllow()">
      {{ t('operations.link.accept_btn') }}
    </ui-button>
    <ui-button raised @click="_clickedDeny()">
      {{ t('operations.link.reject_btn') }}
    </ui-button>
</template>
