<template>
    <div class="bottom p-0">
        <div class="content">
            <div class="row mb-2 account no-gutters">
                <div class="col-8 offset-2 text-center  py-1">
                    <AccountSelect v-model="selectedAccount" chain="ANY" />
                </div>  
                <div class="col-2 text-left py-1">
                    <router-link
                        to="/add-account"
                        tag="button"
                        class="btn btn-lg btn-inverse"
                        replace
                    >
                        +
                    </router-link>
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
    import AccountSelect from "./account-select";
    import Balances from "./balances";
    import { EventBus } from "../lib/event-bus.js";

    export default {
        name: "Dashboard",
        i18nOptions: { namespaces: ["common"] },
        components: { NodeSelect, Balances, AccountSelect },
        data() {
            return {
                api: null,
                incoming: null,
                genericmsg: "",
                specifics: ""
            };
        },
        computed: {
            selectedAccount: {
                get: function() {
                    return this.$store.state.AccountStore.accountlist[
                        this.$store.state.AccountStore.selectedIndex
                    ];
                },
                set: function(newValue) {
                    this.$store.dispatch("AccountStore/selectAccount", newValue);
                }
            },
            accountName() {
                return this.selectedAccount.accountName;
            },
            accountID() {
                return this.selectedAccount.accountID;
            },
            accountlist() {
                return this.$store.state.AccountStore.accountlist;
            }
        },
        watch: {
            selectedAccount: async function(newAcc, oldAcc) {
                if (
                    newAcc.chain != oldAcc.chain ||
                    newAcc.accountID != oldAcc.accountID
                ) {
                    EventBus.$emit("popup", "load-start");
                }
            }
        },
        created() {
            EventBus.$on("balances", what => {
                switch (what) {
                case "loaded":
                    EventBus.$emit("popup", "load-end");
                    break;
                }
            });
        },
        mounted() {
            EventBus.$emit("popup", "load-start");
            //this.$refs.loaderAnimModal.show();
        },
        methods: {
            getBalances: async function() {
                await this.$refs.balancetable.getBalances();
                this.$store.dispatch("WalletStore/confirmUnlock");
                EventBus.$emit("popup", "load-end");
                //this.$emit("load-end");
                //this.$refs.loaderAnimModal.hide();
            }
        }
    };
</script>
