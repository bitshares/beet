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
      blockchain: null,
      nodes: [],
      isConnected: false,
      api: null,
      selectedNode: ""
    };
  },
  watch: {
    selectedNode: function() {
      this.blockchain.connect(this.selectedNode).then(() => {
        this._updateConnectionStatus();
        this.$store.dispatch("SettingsStore/setNode", {
          chain: this.$store.state.WalletStore.wallet.chain,
          node: this.selectedNode
        });
      });
    }
  },
  mounted() {
    this.selectedNode = this.$store.state.SettingsStore.settings.selected_node[this.$store.state.WalletStore.wallet.chain];
    this.blockchain = getBlockchain(this.$store.state.WalletStore.wallet.chain);
    this.nodes = this.blockchain.getNodes();
    this.blockchain.connect(this.selectedNode).then(() => {
      this._updateConnectionStatus();
      this.$emit("first-connect");
    });
  },
  methods: {
    _updateConnectionStatus() {
      this.isConnected = this.blockchain.isConnected();
    },
  }
};
</script>
