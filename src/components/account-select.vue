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
            value: Object
        },
        data() {
            return {                
                selectedAccount: this.value
            };
        },
        computed: {
            accounts() {
                return this.$store.state.AccountStore.accountlist;
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
