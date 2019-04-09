<template>
    <div class="bottom p-0">
        <div class="content">
            <div class="row mb-2 account no-gutters">
                <div class="col-2 text-right label">
                    {{ $t('account') }}
                </div>
                <div class="col-8 text-center">
                    <AccountSelect
                        v-model="selectedAccount"
                        chain="ANY"
                        cta
                    />
                </div>
                <div v-if="isConnecting" class="col-2 text-center icons">
                    <span
                        class="status align-self-center icon-connected"
                    />
                </div>
                <div v-else-if="connectionFailed" class="col-2 text-center icons">
                    <span
                            class="status align-self-center icon-disconnected"
                    />
                </div>
                <div class="col-2 text-center">
                    <!-- todo: why doesnt this icon work? -->
                    <a
                        @click="loadBalances()"
                        class="icon-refresh"
                    />
                </div>
            </div>
            <Balances ref="balancetable" />
        </div>
        <Actionbar />
    </div>
</template>

<script>
    import AccountSelect from "./account-select";
    import Actionbar from "./actionbar";
    import Balances from "./balances";
    import getBlockchain from "../lib/blockchains/blockchainFactory";
    import RendererLogger from "../lib/RendererLogger";
    import { EventBus } from "../lib/event-bus.js";
    const logger = new RendererLogger();

    export default {
        name: "Dashboard",
        i18nOptions: { namespaces: ["common"] },
        components: { Actionbar, Balances, AccountSelect },
        data() {
            return {
                nodes: [],
                api: null,
                isConnected: false,
                isConnecting: false,
                incoming: null,
                genericmsg: "",
                specifics: ""
            };
        },
        computed: {
            connectionFailed() {
                return !this.isConnecting && !this.isConnected;
            },
            selectedAccount: {
                get: function() {
                    return this.$store.state.AccountStore.accountlist[
                        this.$store.state.AccountStore.selectedIndex
                    ];
                },
                set: function(newValue) {
                    this.$store.dispatch("AccountStore/selectAccount", newValue);
                }
            },
            blockchain() {
                return getBlockchain(this.selectedAccount.chain);
            },
            selectedChain() {
                return this.selectedAccount.chain;
            },
            selectedNode: {
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
            },
            accountName() {
                return this.selectedAccount.accountName;
            },
            accountID() {
                return this.selectedAccount.accountID;
            },
            accountlist() {
                return this.$store.state.AccountStore.accountlist;
            }
        },
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
        },
        mounted() {
            EventBus.$emit("popup", "load-start");
            this.nodes = this.blockchain.getNodes();
            this.isConnected = this.blockchain.isConnected();
            this.loadBalances();
        },
        methods: {
            loadBalances: async function() {
                await this.$refs.balancetable.getBalances();
                this.$store.dispatch("WalletStore/confirmUnlock");
                EventBus.$emit("popup", "load-end");
            }
        }
    };
</script>
