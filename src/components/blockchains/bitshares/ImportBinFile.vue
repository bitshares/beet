<template>
    <select
        id="account-select"
        v-model="selectedAccount"
        class="form-control"

    >
        <option :value="{}" Selected v-if="cta!=''">{{cta}}</option>
        <option
            v-for="(account,index) in accounts"
            :key="`account-${index}`"
            :value="account"
        >
            {{ account.chain + ": " + account.accountName + (account.accountName !== account.accountID ? " (" + account.accountID + ")" : "")}}
        </option>
    </select>
</template>

<script>
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();
    export default {
        name: "AccountSelect",
        i18nOptions: { namespaces: "common" },
        props: {
            value: Object,
            chain: String,
            cta: String
        },
        data() {
            return {                
                selectedAccount: this.value
            };
        },
        computed: {
            accounts() {
                if (this.chain=='ANY' || this.chain==null) {
                    return this.$store.state.AccountStore.accountlist;
                }else{
                    return this.$store.state.AccountStore.accountlist.filter ( x => x.chain==this.chain);
                }
            }
        },
        watch: {
            selectedAccount: function() {
                if (this.selectedAccount!={}) {
                    this.$emit("input", this.selectedAccount);
                }
            },
            accounts: function() {
                if (this.accounts.length==1) {
                    this.selectedAccount=this.accounts[0];
                }
            }
        },
        mounted() {
            logger.debug('Account-Selector Mounted');            
        }
    };
</script>
