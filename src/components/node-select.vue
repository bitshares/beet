<template>
<div class="row node-selector">
  <div class="col-2 p-0 text-center d-flex  justify-content-center">
    <span class="align-self-center">Node:</span>
  </div>
    <div class="col-8 p-0">
                        <div class="input-group mb-0">
                            <select class="form-control small" id="node-select" v-model="selectedNode">                                
                                <option v-for="node in nodes" v-bind:value="node.url" v-bind:key="node.url">{{node.url}}</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-2 p-0 text-center d-flex  justify-content-center">
                                <span class="status align-self-center" v-bind:class="{connected: isConnected,disconnected: !isConnected}"></span>
                    </div>
                    </div>
</template>

<script>
import { Apis } from "bitsharesjs-ws";
import { nodeList } from "../config/config";

export default {
  name: "NodeSelect",
  data() {
    return {
      nodes: nodeList,
      isConnected: false,
      api: null,
      selectedNode: "wss://bts-seoul.clockwork.gr"
    };
  },
  watch: {
    selectedNode: function() {
      console.log("Switching...");
      Apis.close().then(() => {
        console.log("Closed...");
        this.isConnected = false;
        Apis.instance(
          this.selectedNode,
          true,
          10000,
          { enableCrypto: false, enableOrders: false },
          this.onClose
        ).init_promise.then(res => {
          console.log("Opened...");
          this.isConnected = true;
          this.$root.$data.api = Apis.instance();
        });
      });
    }
  },
  mounted() {
    console.log(this.selectedNode);
    console.log(nodeList);
    Apis.instance(
      this.selectedNode,
      true,
      10000,
      { enableCrypto: false, enableOrders: false },
      this.onClose
    ).init_promise.then(res => {
      this.isConnected = true;
      this.$root.$data.api = Apis.instance();
      this.$emit("first-connect");
      console.log("emmited");
    });
  },
  onClose() {
    this.isConnected = false;
  }
};
</script>
