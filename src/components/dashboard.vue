<script setup>
    import { watch, ref, computed, onMounted } from "vue";
    const emitter = inject('emitter');
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import AccountSelect from "./account-select";
    import Actionbar from "./actionbar";
    import Balances from "./balances";
    import AccountDetails from "./accountdetails";
    import getBlockchain from "../lib/blockchains/blockchainFactory";
    import RendererLogger from "../lib/RendererLogger";
    import store from '../store/index';

    const logger = new RendererLogger();

    let nodes = ref([]);
    let isConnected = ref(false);
    let isConnecting = ref(false);

    let connectionFailed = computed(() => {
      return !isConnecting || !isConnecting.value && !isConnected || !isConnected.value;
    });

    let selectedAccount = computed(() => {
      get: () {
          return store.state.AccountStore.accountlist[
              store.state.AccountStore.selectedIndex
          ];
      },
      set: (newValue) {
          store.dispatch("AccountStore/selectAccount", newValue);
      }
    });

    let blockchain = computed(() => {
      return getBlockchain(selectedAccount.value.chain);
    });

    let selectedChain = computed(() => {
      return selectedAccount.value.chain;
    });

    let selectedNode = computed(() => {
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

    let accountName = computed(() => {
      return selectedAccount.value.accountName;
    });

    let accountID = computed(() => {
      return selectedAccount.value.accountID;
    });

    let accountlist = computed(() => {
      return store.state.AccountStore.accountlist;
    });

    async function reconnect() {
        let _selectedNode = selectedNode.value;
        let idx = nodes.value.findIndex(item => item.url == _selectedNode);
        if (nodes.value.length == idx+1) {
            idx = -1;
        }

        selectedNode.value = nodes.value[idx+1].url;
    }

    async function loadBalances() {
        //await this.$refs.balancetable.getBalances();
        store.dispatch("WalletStore/confirmUnlock");
    }

    onMounted(() => {
      nodes.value = blockchain.value.getNodes();
      isConnected.value = blockchain.value.isConnected();
      loadBalances();
    });

    // Is EventBus here necessary? Could this be a computed field and listen
    // to this.blockchain.isConnected?
    emitter.on("blockchainStatus", what => {
        if (what.chain == selectedChain.value) {
            isConnected.value = what.status;
            isConnecting.value = !!what.connecting;
        }
    });

    watch(selectedChain, async (newVal, oldVal) => {
      if (oldVal !== newVal) {
          isConnected.value = false;
          nodes.value = blockchain.getNodes();
          isConnected.value = blockchain.isConnected();
          if (!selectedNode || !selectedNode.value) {
              selectedNode.value = nodes.value[0].url;
          }
      }
    }, {immediate: true});
</script>

<template>
    <div class="bottom p-0">
        <div class="content">
            <ui-grid class="row mb-2 account no-gutters">
              <ui-grid-cell class="text-right label" columns="2">
                  {{ t('common.account') }}
              </ui-grid-cell>

              <ui-grid-cell class="text-center" columns="8">
                  <AccountSelect
                      v-model="selectedAccount"
                      chain="ANY"
                      cta
                  />
              </ui-grid-cell>

              <ui-grid-cell v-if="isConnecting" columns="2" class="text-center icons">
                  <a
                      href="#"
                      @click="reconnect()"
                      class="status align-self-center"
                  >
                      <span
                          class="status align-self-center icon-connected"
                      />
                  </a>
              </ui-grid-cell>

              <ui-grid-cell v-else-if="connectionFailed" class="col-2 text-center icons" columns="2">
                  <a
                      href="#"
                      @click="reconnect()"
                      class="status align-self-center"
                  >
                      <span
                          class="status align-self-center icon-disconnected"
                      />
                  </a>
              </ui-grid-cell>

              <ui-grid-cell v-else class="col-2 text-center" columns="2">
                  <a
                      href="#"
                      @click="loadBalances()"
                      class="status align-self-center"
                  >
                      <span
                          v-tooltip="t('common.tooltip_refresh')"
                          class="icon-spinner11"
                      />
                  </a>
              </ui-grid-cell>
            </ui-grid>
            <AccountDetails :account="selectedAccount"/>
            <Balances ref="balancetable" />
        </div>
        <Actionbar />
    </div>
</template>
