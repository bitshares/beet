<script setup>
    import { defineProps } from "vue";
    import ImportCloudPass from "./bitshares/ImportCloudPass";
    import ImportBinFile from "./bitshares/ImportBinFile";
    import ImportMemo from "./bitshares/ImportMemo";
    import ImportKeys from "./ImportKeys";
    import ImportAdressBased from "./address/ImportAdressBased";

    const selectedChain = defineProps(["chain", "type"]);

    function getAccountEvent() {
        return this.$refs.chosen_import.getAccountEvent();
    }
</script>

<template>
    <ImportAdressBased
        v-if="type == 'address/ImportAdressBased'"
        ref="chosen_import"
        :selected-chain="chain"
    />
    <ImportAdressBased
        v-else-if="type == 'ImportAdressBased'"
        ref="chosen_import"
        :selected-chain="chain"
    />
    <ImportKeys
        v-else-if="type == 'ImportKeys'"
        ref="chosen_import"
        :selected-chain="chain"
    />
    <ImportCloudPass
        v-else-if="type == 'bitshares/ImportCloudPass'"
        ref="chosen_import"
        :selected-chain="chain"
    />
    <ImportBinFile
        v-else-if="type == 'bitshares/ImportBinFile'"
        ref="chosen_import"
        :selected-chain="chain"
    />
    <ImportMemo
        v-else-if="type == 'bitshares/ImportMemo'"
        ref="chosen_import"
        :selected-chain="chain"
    />
    <div v-else>
        No import option found
    </div>
</template>
