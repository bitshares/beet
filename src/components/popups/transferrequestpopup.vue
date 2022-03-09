<script setup>
    import { ipcRenderer } from 'electron';
    import {ref, onMounted} from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import store from '../store/index';
    import RendererLogger from "../../lib/RendererLogger";
    import getBlockchain from "../../lib/blockchains/blockchainFactory";
    const logger = new RendererLogger();
    import {getKey} from '../../lib/SecureRemote';

    let type = ref("TransferRequestPopup");
    let message = ref(null);
    let recipient = ref(null);
    let satoshis = ref(null);
    let feeInSatoshis = ref(null);
    let asset_id = ref(null);
    let toSend = ref(null);
    let toSendFee = ref(null);

    ///

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

    onMounted(async () => {
      logger.debug("Transfer request popup initialised");
      store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});



      message.value = t("operations.transfer.request", {
          appName: incoming.value.appName,
          origin: incoming.value.origin,
          chain:   store.getters['AccountStore/getSigningKey'](incoming.value).chain,
          accountName:   store.getters['AccountStore/getSigningKey'](incoming.value).accountName
      });

      to.value = incoming.value.params.to;
      satoshis.value = incoming.value.params.amount.satoshis;
      asset_id.value = incoming.value.params.amount.asset_id;

      let blockchain = getBlockchain(incoming.value.chain);
      toSend.value = blockchain.format(incoming.value.params.amount);

      if (blockchain.supportsFeeCalculation()) {
          toSendFee.value = "Calculating ...";

          let activeKey;
          try {
            activeKey = await getKey(store.getters['AccountStore/getSigningKey'](incoming.value).keys.active)
          } catch (error) {
            console.log(error);
            _reject.value({ error: error });
            ipcRenderer.send("modalError", true);
          }

          let result;
          try {
              result = await blockchain.transfer(
                  activeKey,
                  store.getters['AccountStore/getSigningKey'](incoming.value).accountName,
                  to.value,
                  {
                      amount: incoming.value.params.amount.satoshis || incoming.value.params.amount.amount,
                      asset_id: incoming.value.params.amount.asset_id
                  },
                  incoming.value.params.memo,
                  false
              );
          } catch (error) {
              console.log(error);
              _reject.value({ error: error });
              ipcRenderer.send("modalError", true);
          }

          feeInSatoshis = result.feeInSatoshis;
          toSendFee = blockchain.format(feeInSatoshis);
      }

    });

    async function _clickedAllow() {
        let blockchain = getBlockchain(incoming.value.chain);

        if (!incoming.value.params.amount) {
            incoming.value.params.amount = incoming.value.params.satoshis;
        }

        let signingKey;
        try {
          signingKey = await getKey(store.getters['AccountStore/getSigningKey'](incoming.value).keys.active)
        } catch (error) {
          console.log(error);
          _reject.value({ error: error });
          ipcRenderer.send("modalError", true);
        }

        let result;
        try {
          result = await blockchain.transfer(
              signingKey,
              store.getters['AccountStore/getSigningKey'](incoming.value).accountName,
              to.value,
              {
                  amount: incoming.value.params.amount.satoshis || incoming.value.params.amount.amount,
                  asset_id: incoming.value.params.amount.asset_id
              },
              incoming.value.params.memo,
          );
        } catch (error) {
          console.log(error);
          _reject.value({ error: error });
          ipcRenderer.send("modalError", true);
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

        ipcRenderer.send("notify", 'Transaction `transfer` successfully broadcast.');
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
    <pre class="text-left custom-content">
      <span v-if="toSendFee">
        <code>
          Recipient: {{ to }}
          Amount: {{ toSend }}
          Fee: {{ toSendFee }}
        </code>
      </span>
      <span v-else>
        <code>
          Recipient: {{ to }}
          Amount: {{ toSend }}
        </code>
      </span>
    </pre>
    <ui-button raised @click="_clickedAllow">
        {{ t("operations.transfer.accept_btn") }}
    </ui-button>
    <ui-button raised @click="_clickedDeny">
        {{ t("operations.transfer.reject_btn") }}
    </ui-button>
</template>
