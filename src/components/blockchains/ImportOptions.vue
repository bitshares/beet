<script setup>
    import {ref} from 'vue';
    import ImportCloudPass from "./bitshares/ImportCloudPass";
    import ImportBinFile from "./bitshares/ImportBinFile";
    import ImportMemo from "./bitshares/ImportMemo";
    import ImportKeys from "./ImportKeys";
    import ImportAddressBased from "./address/ImportAddressBased";

    const props = defineProps({
      chain: String,
      type: String
    });

    let chosen_import = ref(null);
    function getAccountEvent() {
        return chosen_import.getAccountEvent();
    }
</script>

<template>
    <ImportAddressBased
        v-if="type == 'address/ImportAddressBased'"
        ref="chosen_import"
        :selected-chain="chain"
    />
    <ImportAddressBased
        v-else-if="type == 'ImportAddressBased'"
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
