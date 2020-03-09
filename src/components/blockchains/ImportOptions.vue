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

<script>
    import ImportCloudPass from "./bitshares/ImportCloudPass";
    import ImportBinFile from "./bitshares/ImportBinFile";
    import ImportMemo from "./bitshares/ImportMemo";
    import ImportKeys from "./ImportKeys";
    import ImportAdressBased from "./address/ImportAdressBased";

    export default {
        name: "ImportOptions",
        props: [ "chain", "type" ],
        components: {ImportCloudPass, ImportBinFile, ImportKeys, ImportAdressBased, ImportMemo},
        mounted() {
            // todo: ideally this is a dynamic import component, not importing all at once
            // see https://vuejs.org/v2/guide/components-dynamic-async.html
            // see https://medium.com/scrumpy/dynamic-component-templates-with-vue-js-d9236ab183bb
            // the above two dont work for some reason
        },
        methods: {
            getAccountEvent: function() {
                return this.$refs.chosen_import.getAccountEvent();
            }
        }

    };
</script>
