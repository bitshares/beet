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
                    class="form-control small"
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
                :class="{connected: isConnected,disconnected: !isConnected}"
            />
        </div>
    </div>
</template>

<script>
    import { Apis } from "bitsharesjs-ws";
    import { nodeList } from "../config/config";

    export default {
        name: "NodeSelect",
        i18nOptions: { namespaces: "common" },
        data() {
            return {
                nodes: nodeList,
                isConnected: false,
                api: null,
                selectedNode: this.$store.state.SettingsStore.settings.selected_node
            };
        },
        watch: {
            selectedNode: function() {
                console.log("Switching Node.");
                Apis.close().then(() => {
                    console.log("Closed Node.");
                    this.isConnected = false;
                    Apis.instance(
                        this.selectedNode,
                        true,
                        10000,
                        { enableCrypto: false, enableOrders: false },
                        this.onClose
                    ).init_promise.then(() => {
                        console.log("Opened Node");
                        this.$store.dispatch("SettingsStore/setNode", {
                            node: this.selectedNode
                        });
                        this.isConnected = true;
                    });
                });
            }
        },
        mounted() {
            Apis.instance(
                this.selectedNode,
                true,
                10000,
                { enableCrypto: false, enableOrders: false },
                this.onClose
            ).init_promise.then(() => {
                this.isConnected = true;
                this.$emit("first-connect");
            });
        },
        onClose() {
            this.isConnected = false;
        }
    };
</script>
