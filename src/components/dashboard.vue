<template>
    <div class="bottom ">
        <div class="content">
            <div class="row mb-2">
                <div class="col-12 text-center account py-2">
                    {{ accountName }} ({{ accountID }})
                </div>
            </div>
            <Balances ref="balancetable" />
        </div>
        <NodeSelect
            ref="apinode"
            @first-connect="getBalances"
        />
    </div>

</template>

<script>
    import NodeSelect from "./node-select";
    import Balances from "./balances";
    import { EventBus } from '../lib/event-bus.js';

    export default {
        name: "Dashboard",
        i18nOptions: { namespaces: ["common"] },
        components: { NodeSelect, Balances },
        data() {
            return {
                api: null,
                incoming: null,
                genericmsg: "",
                specifics: ""
            };
        },
        computed: {
            accountName() {
                return this.$store.state.WalletStore.wallet.accountName;
            },
            accountID() {
                return this.$store.state.WalletStore.wallet.accountID;
            }
        },
        mounted() {
            EventBus.$emit('popup', 'load-start');
            //this.$refs.loaderAnimModal.show();
        },
        methods: {
            getBalances: async function() {
                await this.$refs.balancetable.getBalances();
                this.$store.dispatch("WalletStore/confirmUnlock");
                EventBus.$emit('popup', 'load-end');
                //this.$emit("load-end");
                //this.$refs.loaderAnimModal.hide();
            }
        }
    };
</script>
