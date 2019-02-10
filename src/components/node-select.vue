<template>
    <div class="row node-selector">
        <div class="col-2 p-0 text-center d-flex  justify-content-center">
            <span class="align-self-center">{{ $t('node_lbl') }}</span>
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
                    >{{ node.url }}</option>
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

const logger = new RendererLogger();

export default {
  name: "NodeSelect",
  i18nOptions: { namespaces: "common" },
  data() {
    return {
      nodes: [],
      isConnected: false,
      api: null
    };
  },
  computed: {
      blockchain() {
        return getBlockchain(this.selectedAccount.chain);
      },
      selectedNode() {
        return this.$store.state.SettingsStore.settings.selected_node[this.selectedAccount.chain];
      },
      selectedAccount() {
          return this.$store.state.AccountStore.accountlist[this.$store.state.AccountStore.selectedIndex];
      },
      selectedChain() {
          return this.selectedAccount.chain;
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
    selectedNode: function(newVal, oldVal) {
      if (!!oldVal && oldVal !== newVal) {
          // this means user has actively changed the value
          this.blockchain.connect(newVal).then(() => {
              this._updateConnectionStatus();
              this.$store.dispatch("SettingsStore/setNode", {
                  chain: this.selectedChain,
                  node: this.newVal
              });
          }).catch((err) => {
              logger.error(err);
          });
      } else {
          // do nothing, as the value displayed is the already connected default node
      }

    }
  },
  mounted() {
    this.nodes = this.blockchain.getNodes();
    this.blockchain.connect(this.selectedNode).then((connectedNode) => {
      if (!this.selectedNode) {
       this.$store.dispatch("SettingsStore/setNode", {
                  chain: this.selectedChain,
                  node: connectedNode
              });
      }
      this._updateConnectionStatus();
      this.$emit("first-connect");
    }).catch((err) => {
        logger.error(err);
    });
  },
  methods: {
    _updateConnectionStatus() {
      this.isConnected = this.blockchain.isConnected();
    },
  }
};
</script>
