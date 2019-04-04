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
                <div class="col-2 text-center icons">
                    <span
                        class="status align-self-center"
                        :class="{'icon-connected': isConnected,'icon-disconnected': !isConnected}"
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
                incoming: null,
                genericmsg: "",
                specifics: ""
            };
        },
        computed: {
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
                            .connect(newVal)
                            .then(connectedNode => {
                                this.$store.dispatch("SettingsStore/setNode", {
                                    chain: this.selectedChain,
                                    node: connectedNode
                                });
                            })
                            .catch(() => {
                                this.isConnected=false;
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
                    if (!this.selectedNode) {
                        this.selectedNode = this.nodes[0].url;
                    }
                }
            }
        },
        created() {
            EventBus.$on("blockchainStatus", what => {
                if (what.chain == this.selectedChain) {
                    this.isConnected = what.status;
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
            logger.debug("Dashboard Mounted");

            this.nodes = this.blockchain.getNodes();
            let url;
            if (this.selectedNode != undefined) {
                url = this.selectedNode.url;
            } else {
                url = null;
            }
            this.blockchain
                .connect(url)
                .then(connectedNode => {
                    if (!this.selectedNode) {
                        this.$store.dispatch("SettingsStore/setNode", {
                            chain: this.selectedChain,
                            node: connectedNode
                        });
                    }

                    this.getBalances();
                })
                .catch(() => {                    
                    this.isConnected=false;
                });
        },
        methods: {
            getBalances: async function() {
                await this.$refs.balancetable.getBalances();
                this.$store.dispatch("WalletStore/confirmUnlock");
                EventBus.$emit("popup", "load-end");
            }
        }
    };
</script>
