<script setup>
    import { watch, ref, computed, onMounted, inject } from "vue";
    const emitter = inject('emitter');
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });

    import Actionbar from "./actionbar";
    import Balances from "./balances";
    import AccountDetails from "./accountdetails";

    import store from '../store/index';
    import getBlockchainAPI from "../lib/blockchains/blockchainFactory";
    import {formatChain, formatAccount} from "../lib/formatter";
    import RendererLogger from "../lib/RendererLogger";

    const logger = new RendererLogger();

    let nodes = ref([]);
    let isConnected = ref(false);
    let isConnecting = ref(false);

    let blockchain = ref(null);
    let selectedChain = ref(null);
    let accountName = ref('');
    let accountID = ref('');

    let selectedAccount = ref();
    let chosenAccount = ref(-1);

    /*
     * Retrieve the list of accounts for allocation to prop
     */
    let accounts = computed(() => {
      let accountList;
      try {
        accountList = store.getters['AccountStore/getSafeAccountList'];
      } catch (error) {
        console.log(error);
        return [];
      }
      return accountList;
    });

    /*
     * Creating the select items
     */
    let accountOptions = computed(() => {
      let accountList;
      try {
        accountList = store.getters['AccountStore/getAccountList'];
      } catch (error) {
        console.log(error);
        return [];
      }

      let options = accountList.map((account, i) => {
        return {
          label: !account.hasOwnProperty("accountID") && account.trackId == 0
                  ? 'cta' // TODO: Replace
                  : `${formatChain(account.chain)}: ${formatAccount(account)}`,
          value: i
        };
      });

      return options;
    });

    let connectionFailed = computed(() => {
      return !isConnecting || !isConnecting.value && !isConnected || !isConnected.value;
    });

    let selectedNode = computed({
      get: () => {
          return store.state.SettingsStore.settings.selected_node[
              selectedAccount.value.chain
          ];
      },
      set: (newVal) => {
          if (!selectedNode || selectedNode != newVal) {
              blockchain.value
                .ensureConnection(newVal)
                .finally(() => {
                    isConnected.value = blockchain.value.isConnected();
                });
          }
      }
    });

    watch(blockchain, async (newVal, oldVal) => {
      if (newVal && newVal !== oldVal) {
        nodes.value = blockchain.value.getNodes();
        isConnected.value = blockchain.value.isConnected();
      }
    }, {immediate: true});

    /*
     * User selected from the account drop down menu
     */
    watch(chosenAccount, async (newVal, oldVal) => {
      if (newVal !== -1) {
        selectedAccount.value = accounts.value[newVal];
        store.dispatch(
          "AccountStore/selectAccount",
          {chain: accounts.value[newVal].chain, accountID: accounts.value[newVal].accountID}
        );
      }
    }, {immediate: true});

    /*
     * Account data has changed
     */
    watch(selectedAccount, async (newVal, oldVal) => {
      if (newVal && newVal !== oldVal) {
        blockchain.value = getBlockchainAPI(newVal.chain);
        selectedChain.value = newVal.chain;
        accountName.value = newVal.accountName;
        accountID.value = newVal.accountID;
      }
    }, {immediate: true});

    watch(selectedChain, async (newVal, oldVal) => {
      if (newVal && newVal !== oldVal) {
          isConnected.value = false;
          nodes.value = blockchain.value.getNodes();
          isConnected.value = blockchain.value.isConnected();
          if (!selectedNode || !selectedNode.value) {
              selectedNode.value = nodes.value[0].url;
          }
      }
    }, {immediate: true});

    async function reconnect() {
        let _selectedNode = selectedNode.value;
        let idx = nodes.value.findIndex(item => item.url == _selectedNode);
        if (nodes.value.length == idx+1) {
            idx = -1;
        }

        selectedNode.value = nodes.value[idx+1].url;
    }

    // Is EventBus here necessary? Could this be a computed field and listen
    // to this.blockchain.isConnected?
    emitter.on("blockchainStatus", what => {
        if (what.chain == selectedChain.value) {
            isConnected.value = what.status;
            isConnecting.value = !!what.connecting;
        }
    });
</script>

<template>
    <ui-select
        id="account_select"
        v-model="chosenAccount"
        :options="accountOptions"
        required
        full-bleed
    >
        Account
    </ui-select>

    <div v-if="chosenAccount > -1 && selectedAccount" class="acc-info">
        <ui-button v-if="isConnecting" disabled>
            Connecting
        </ui-button>
        <ui-button v-if="isConnected" disabled>
            Connected!
        </ui-button>
        <ui-button v-else-if="connectionFailed" @click="reconnect()" outlined>
            Reconnect
        </ui-button>
        <br/>
        <AccountDetails :account="selectedAccount"/>
        <br/>
        <Balances :account="selectedAccount"/>
    </div>

    <Actionbar />
</template>
