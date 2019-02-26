<template>
    <select
        id="account-select"
        v-model="selectedAccount"
        class="form-control"
    >
        <option
            v-for="(account,index) in accounts"
            :key="`account-${index}`"
            :value="account"
        >
            {{ account.chain+": "+account.accountName+" ("+account.accountID+")" }}
        </option>
    </select>
</template>

<script>
    export default {
        name: "AccountSelect",
        i18nOptions: { namespaces: "common" },
        props: {
            value: Object,
            chain: String
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
                this.$emit("input", this.selectedAccount);
            }
        },
        mounted() {
            console.log(this.$store.state.AccountStore.accountlist);
        }
    };
</script>
