<script setup>
    import {ref, onMounted} from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import store from '../store/index';
    import RendererLogger from "../../lib/RendererLogger";
    import getBlockchain from "../../lib/blockchains/blockchainFactory";
    import {getKey} from '../../lib/SecureRemote';
    import {formatChain} from "../../lib/formatter";
    const logger = new RendererLogger();

    let type = ref("TransactionRequestPopup");
    let incoming = ref({
        signingAccount: {},
        visualized: null
    });

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

    onMounted(async () => {
      logger.debug("Tx Popup initialised");
      store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});

      let blockchain = getBlockchain(incoming.value.chain);
      let visualizedParams;
      try {
        visualizedParams = await blockchain.visualize(incoming.value.params);
      } catch (error) {
        console.log(error);
        return;
      }

      incoming.value.visualized = visualizedParams;
      incoming.value = Object.assign({}, incoming.value); // Why?

      let visualizedAccount;
      try {
        visualizedAccount = await blockchain.visualize(incoming.value.account_id);
      } catch (error) {
        console.log(error);
        _reject.value({ error: error });
        ipcRenderer.send("modalError", true);
      }

      incoming.value.account_name = visualizedAccount;
      incoming.value = Object.assign({}, incoming.value); // Why?
    });

    async function _clickedAllow() {
        let blockchain = getBlockchain(incoming.value.chain);
        let txType = incoming.value.params[0];
        let result;
        if (txType == "sign") {
            let transaction;
            try {
              transaction = await blockchain.sign(
                  incoming.value.params,
                  await getKey(store.getters['AccountStore/getSigningKey'](incoming.value).keys.active)
              );
            } catch (error) {
              console.log(error);
              _reject.value({ error: error });
              ipcRenderer.send("modalError", true);
            }
            result = transaction.toObject();
        } else if (txType == "broadcast") {
            try {
              result = await blockchain.broadcast(incoming.value.params);
            } catch (error) {
              console.log(error);
              _reject.value({ error: error });
              ipcRenderer.send("modalError", true);
            }
        } else if (txType == "signAndBroadcast") {
            let transaction;
            try {
              transaction = await blockchain.sign(
                  incoming.value.params,
                  await getKey(store.getters['AccountStore/getSigningKey'](incoming.value).keys.active)
              );
            } catch (error) {
              console.log(error);
              _reject.value({ error: error });
              ipcRenderer.send("modalError", true);
            }

            try {
              result = await blockchain.broadcast(transaction);
            } catch (error) {
              console.log(error);
              _reject.value({ error: error });
              ipcRenderer.send("modalError", true);
            }
        }

        // todo allowWhitelist move whitelisting to BeetAPI, thus return flag here
        _accept.value(
            {
                response: result,
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
        
        ipcRenderer.send("notify", 'Transaction successfully broadcast.');
        ipcRenderer.send("clickedAllow", true);
    }

    function _clickedDeny() {
        ipcRenderer.send("clickedDeny", true);
        _reject.value({ canceled: true });
    }

    function getChainLabel(chain) {
        return formatChain(chain);
    }

    // TODO: REFACTOR THIS FUNCTION
    function getRequestType() {
        if (incoming.value.params && incoming.value.params.length > 0 && incoming.value.params[0] == "sign") {
            return "sign"
        } else {
            return "sign_and_broadcast";
        }
    }
</script>
<template>
    <table
        v-tooltip="t('operations.rawsig.request',
            { appName: incoming.appName,
              origin: incoming.origin,
              chain: getChainLabel(incoming.chain),
              accountName: incoming.account_id
            }
        )"
        class="table small table-striped table-sm"
    >
        <tbody>
            <tr>
                <td class="text-left">
                    Origin
                </td>
                <td class="text-right">
                    {{incoming.origin}}
                </td>
            </tr>
            <tr>
                <td class="text-left">
                    App
                </td>
                <td class="text-right">
                    {{incoming.appName}}
                </td>
            </tr>
            <tr>
                <td class="text-left">
                    Account
                </td>
                <td class="text-right">
                    {{getChainLabel(incoming.chain) + ":" + (incoming.account_name ? incoming.account_name : incoming.account_id)}}
                </td>
            </tr>
            <tr>
                <td class="text-left">
                    Action
                </td>
                <td class="text-right">
                    {{getRequestType() ? t('operations.rawsig.sign_btn') : t('operations.rawsig.sign_and_broadcast_btn') }}
                </td>
            </tr>
        </tbody>
    </table>
    <p class="mb-1 font-weight-bold small">
        {{ t('operations.general.content') }}
    </p>
    <div
        v-if="!!incoming.visualized"
        class="text-left custom-content"
        v-html="incoming.visualized"
    />
    <pre
        v-else-if="!!incoming.params"
        class="text-left custom-content"
    >
      <code>
        {
          {{ incoming.params }}
        }
      </code>
    </pre>
    {{ t('operations.rawsig.request_cta') }}
    <ui-button raised @click="_clickedAllow">
        {{ getRequestType() == "sign" ? t('operations.rawsig.sign_btn') : t('operations.rawsig.sign_and_broadcast_btn') }}
    </ui-button>
    <ui-button raised @click="_clickedDeny">
        {{ t('operations.rawsig.reject_btn') }}
    </ui-button>
</template>
