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
            selectedAccount: async function(newAcc,oldAcc) {
                if (newAcc.chain!=oldAcc.chain || newAcc.accountID!=oldAcc.accountID) {                    
                    EventBus.$emit('popup', 'load-start');
                }
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
