<script setup>
    import { ipcRenderer } from 'electron';
    import { ref, onMounted, computed, watch } from "vue";

    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import AccountSelect from "../account-select";
    import store from '../../store/index';
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();
    import {formatChain, formatAccount} from "../../lib/formatter";

    let chosenAccount = ref(-1);
    let allowWhitelist = ref(false);

    const props = defineProps({
      request: Object,
      accounts: Array,
      existingLinks: Array
    });

    let requestText = computed(() => {
      return t(
        'operations.link.request',
        {
          appName: props.request.appName,
          origin: props.request.origin,
          chain: props.request.chain
        }
      );
    });

    let secondText = computed(() => {
      return t('operations.link.request_fresh', {chain: props.request.chain });
    });

    /*
     * Creating the select items
     */
    let accountOptions = computed(() => {
      return props.accounts.map((account, i) => {
        return {
          label: !account.hasOwnProperty("accountID") && account.trackId == 0
                  ? `account ${i}` // TODO: Replace placeholder!
                  : `${formatChain(account.chain)}: ${formatAccount(account)}`,
          value: i
        };
      });
    });

    /*
    watch(chosenAccount, (newVal, oldVal) => {
      if (newVal !== oldVal) {
        console.log(`newVal: ${newVal}`);
      }
    }, {immediate: true});
    */

    onMounted(() => {
      logger.debug("Link Popup initialised");
    })

    async function _clickedAllow() {
        let approvedAccount = props.accounts[chosenAccount.value];

        ipcRenderer.send(
            "clickedAllow",
            {
              response: {
                  name: approvedAccount.accountName,
                  chain: approvedAccount.chain,
                  id: approvedAccount.accountID
              },
              request: {
                id: props.request.id
              },
              whitelisted: allowWhitelist.value
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
  <div>
    <div v-tooltip="t('operations.link.request_tooltip')">
        {{ requestText }}
    </div>
    <br>
    <div v-if="existingLinks.length > 0">
        {{ secondText }}
    </div>
    <br>
    <select
        id="account_select"
        v-model="chosenAccount"
        class="form-control mb-3"
        required
    >
        <option selected disabled value="">
            Account select
        </option>
        <option
            v-for="account in accountOptions"
            :key="account.value"
            :value="account.value"
        >
          <span>
            {{ account.label }}
          </span>
        </option>
    </select>
    <br/>
    <div v-if="chosenAccount == -1">
        <ui-button disabled>
            {{ t('operations.link.accept_btn') }}
        </ui-button>
        <ui-button raised @click="_clickedDeny()">
            {{ t('operations.link.reject_btn') }}
        </ui-button>
    </div>
    <div v-else>
        <ui-button raised @click="_clickedAllow()">
            {{ t('operations.link.accept_btn') }}
        </ui-button>
        <ui-button raised @click="_clickedDeny()">
            {{ t('operations.link.reject_btn') }}
        </ui-button>
    </div>
  </div>
</template>
