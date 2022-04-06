<script setup>
    import { ipcRenderer } from 'electron';
    import {ref, onMounted} from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import store from '../store/index';
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    const props = defineProps({
      request: Object
    });

    let type = ref("ReLinkRequestPopup");
    let chosenAccount = ref({ trackId: 0 });
    let beetapp = ref({});

    let allowWhitelist = ref(false);

    let incoming = ref({});
    let requestText = ref('');

    onMounted(() => {
      logger.debug("Relink Popup initialised");
      store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"}); //show alert instead?
      beetapp.value = store.state.OriginStore.apps.filter(
          x => x.identityhash == incoming.value.payload.identityhash
      )[0];
      requestText.value = t('operations.relink.request', {appName: incoming.appName, origin: incoming.origin, chain: incoming.chain, accountId: beetapp.account_id });
    });

    /////////

    async function _clickedAllow() {
        try {
            let account = store.state.AccountStore.accountlist.filter(
                x => x.accountID == beetapp.value.account_id && x.chain == beetapp.value.chain
            );

            // todo allowWhitelist move whitelisting to BeetAPI, thus return flag here
            _accept.value(
                {
                    response: {
                        identityhash: incoming.value.payload.identityhash,
                        name: account.value.accountName,
                        chain: beetapp.value.chain,
                        id: beetapp.value.account_id
                    },
                    whitelisted: allowWhitelist.value
                }
            );
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
