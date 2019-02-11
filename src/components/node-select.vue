<template>
    <div class="row node-selector">
        <div class="col-2 p-0 text-center d-flex  justify-content-center">
            <span class="align-self-center">
                {{ $t('node_lbl') }}
            </span>
        </div>
        <div class="col-8 p-0">
            <div class="input-group mb-0">
                <select
                    id="node-select"
                    v-model="selectedNode"
                    class="form-control "
                >
                    <option
                        v-for="node in nodes"
                        :key="node.url"
                        :value="node.url"
                    >
                        {{ node.url }}
                    </option>
                </select>
            </div>
        </div>
        <div class="col-2 p-0 text-center d-flex  justify-content-center">
            <span
                class="status align-self-center"
                :class="{'icon-connected': isConnected,'icon-disconnected': !isConnected}"
            />
        </div>
    </div>
</template>

<script>
    import getBlockchain from "../lib/blockchains/blockchainFactory"
    import RendererLogger from "../lib/RendererLogger";
    import { EventBus } from "../lib/event-bus.js";    const logger = new RendererLogger();

    export default {
        name: "NodeSelect",
        i18nOptions: { namespaces: "common" },
        data() {
            return {
                nodes: [],
                api: null,
                isConnected: false
            };
        },
        computed: {
            blockchain() {
                return getBlockchain(this.selectedAccount.chain);
            },
            selectedChain() {
                return this.selectedAccount.chain;
            },
            selectedNode: {
                get: function() {
                    return this.$store.state.SettingsStore.settings.selected_node[this.selectedAccount.chain];
                },
                set: function(newVal) {
                    if (!this.selectedNode || this.selectedNode != newVal) {
                        this.blockchain.connect(newVal).then((connectedNode) => {
                            
                            this.$store.dispatch("SettingsStore/setNode", {
                                chain: this.selectedChain,
                                node: connectedNode
                            });
                        }).catch((err) => {
                            logger.error(err);
                        });
                    }
                }
            },
            selectedAccount() {
                return this.$store.state.AccountStore.accountlist[this.$store.state.AccountStore.selectedIndex];
            },
            accountName() {
                return this.selectedAccount.accountName;
            },
            accountID() {
                return this.selectedAccount.accountID;
            },
            accountlist() {
                return this.$store.state.AccountStore.accountlist
            }
        },
        watch: {
            selectedChain: function(newVal, oldVal) {
                if (oldVal !== newVal) {
                    this.nodes = this.blockchain.getNodes();                    
                    if (!this.selectedNode) {
                        this.selectedNode= this.nodes[0].url;
                    }
                }
            }
        },
        created() {
            EventBus.$on("blockchainStatus", what => {
                console.log(what);
                console.log(this.selectedChain);
                if (what.chain==this.selectedChain) {
                    this.isConnected=what.status;
                    console.log('setstatus');
                }
            });
        },
        mounted() {
            this.nodes = this.blockchain.getNodes();
            this.blockchain.connect(this.selectedNode.url).then((connectedNode) => {
                if (!this.selectedNode) {
                    this.$store.dispatch("SettingsStore/setNode", {
                        chain: this.selectedChain,
                        node: connectedNode
                    });
                }
                
                this.$emit("first-connect");
            }).catch((err) => {
                logger.error(err);
            });
        }
    };
</script>
