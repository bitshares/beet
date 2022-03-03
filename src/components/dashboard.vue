<script>
    import AccountSelect from "./account-select";
    import Actionbar from "./actionbar";
    import Balances from "./balances";
    import AccountDetails from "./accountdetails";
    import getBlockchain from "../lib/blockchains/blockchainFactory";
    import RendererLogger from "../lib/RendererLogger";
    import { EventBus } from "../lib/event-bus.js";
    const logger = new RendererLogger();

    let connectionFailed = computed(() => {
      return !this.isConnecting && !this.isConnected;
    });

    let selectedAccount = computed(() => {
      get: () {
          return this.$store.state.AccountStore.accountlist[
              this.$store.state.AccountStore.selectedIndex
          ];
      },
      set: (newValue) {
          this.$store.dispatch("AccountStore/selectAccount", newValue);
      }
    });

    let blockchain = computed(() => {
      return getBlockchain(this.selectedAccount.chain);
    });

    let selectedChain = computed(() => {
      return this.selectedAccount.chain;
    });

    let selectedNode = computed(() => {
      get: function() {
          return this.$store.state.SettingsStore.settings.selected_node[
              this.selectedAccount.chain
          ];
      },
      set: function(newVal) {
          if (!this.selectedNode || this.selectedNode != newVal) {
              this.blockchain
                  .ensureConnection(newVal)
                  .finally(() => {
                      this.isConnected = this.blockchain.isConnected();
                  });
          }
      }
    });

    let accountName = computed(() => {
      return this.selectedAccount.accountName;
    });

    let accountID = computed(() => {
      return this.selectedAccount.accountID;
    });

    let accountlist = computed(() => {
      return this.$store.state.AccountStore.accountlist;
    });

    let nodes = [];
    let api = null;
    let isConnected = false;
    let isConnecting = false;
    let incoming = null;
    let genericmsg = "";
    let specifics = "";

    async function reconnect() {
        let _selectedNode = this.selectedNode;
        let idx = this.nodes.findIndex(item => item.url == _selectedNode);
        if (this.nodes.length == idx+1) {
            idx = -1;
        }
        this.selectedNode = this.nodes[idx+1].url;
    }

    async function loadBalances() {
        EventBus.$emit("popup", "load-start");
        await this.$refs.balancetable.getBalances();
        this.$store.dispatch("WalletStore/confirmUnlock");
        EventBus.$emit("popup", "load-end");
    }

    onMounted(() => {
      EventBus.$emit("popup", "load-start");
      this.nodes = this.blockchain.getNodes();
      this.isConnected = this.blockchain.isConnected();
      this.loadBalances();
    });


    export default {
        watch: {
            selectedAccount: async function(newAcc, oldAcc) {
                if (
                    newAcc.chain != oldAcc.chain ||
                    newAcc.accountID != oldAcc.accountID
                ) {
                    EventBus.$emit("popup", "load-start");
                }
            },
            selectedChain: function(newVal, oldVal) {
                if (oldVal !== newVal) {
                    this.isConnected = false;
                    this.nodes = this.blockchain.getNodes();
                    this.isConnected = this.blockchain.isConnected();
                    if (!this.selectedNode) {
                        this.selectedNode = this.nodes[0].url;
                    }
                }
            }
        },
        created() {
            // Is EventBus here necessary? Could this be a computed field and listen
            // to this.blockchain.isConnected?
            EventBus.$on("blockchainStatus", what => {
                if (what.chain == this.selectedChain) {
                    this.isConnected = what.status;
                    this.isConnecting = !!what.connecting;
                }
            });
            EventBus.$on("balances", what => {
                switch (what) {
                case "loaded":
                    EventBus.$emit("popup", "load-end");
                    break;
                }
            });
        }
    };
</script>

<template>
    <div class="bottom p-0">
        <div class="content">
            <div class="row mb-2 account no-gutters">
                <div class="col-2 text-right label">
                    {{ $t('common.account') }}
                </div>
                <div class="col-8 text-center">
                    <AccountSelect
                        v-model="selectedAccount"
                        chain="ANY"
                        cta
                    />
                </div>
                <div v-if="isConnecting" class="col-2 text-center icons">
                    <a
                        href="#"
                        @click="reconnect()"
                        class="status align-self-center"
                    >
                        <span
                            class="status align-self-center icon-connected"
                        />
                    </a>
                </div>
                <div v-else-if="connectionFailed" class="col-2 text-center icons">
                    <a
                        href="#"
                        @click="reconnect()"
                        class="status align-self-center"
                    >
                        <span
                            class="status align-self-center icon-disconnected"
                        />
                    </a>
                </div>
                <div v-else class="col-2 text-center">
                    <a
                        href="#"
                        @click="loadBalances()"
                        class="status align-self-center"
                    >
                        <span
                            v-b-tooltip.hover
                            v-b-tooltip.d500
                            :title="$t('common.tooltip_refresh')"
                            class="icon-spinner11"
                        />
                    </a>
                </div>
            </div>
            <AccountDetails :account="selectedAccount"/>
            <Balances ref="balancetable" />
        </div>
        <Actionbar />
    </div>
</template>
