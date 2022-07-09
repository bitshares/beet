<script setup>
    import { watch, ref, computed, inject } from "vue";
    import { useI18n } from 'vue-i18n';
    import Actionbar from "./actionbar";
    import Balances from "./balances";
    import AccountDetails from "./accountdetails";

    import store from '../store/index';
    import {formatChain, formatAccount} from "../lib/formatter";
    import RendererLogger from "../lib/RendererLogger";
    const emitter = inject('emitter');
    const { t } = useI18n({ useScope: 'global' });
    const logger = new RendererLogger();

    let selectedChain = ref(null);
    let accountName = ref('');
    let accountID = ref('');

    let selectedAccount = ref();
    let chosenAccount = ref(-1);

    /*
     * Retrieve the list of accounts for allocation to prop
     */
    let accounts = computed(() => {
        let accountList;
        try {
            accountList = store.getters['AccountStore/getSafeAccountList'];
        } catch (error) {
            console.log(error);
            return [];
        }
        return accountList;
    });

    /*
     * Creating the select items
     * @returns {Array}
     */
    let accountOptions = computed(() => {
        let accountList;
        try {
            accountList = store.getters['AccountStore/getSafeAccountList'];
        } catch (error) {
            console.log(error);
            return [];
        }

        let options = accountList.map((account, i) => {
            return {
                label: !account.accountID && account.trackId == 0
                    ? 'cta' // TODO: Replace
                    : `${formatChain(account.chain)}: ${formatAccount(account)}`,
                value: i
            };
        });

        return options;
    });

    /*
     * User selected from the account drop down menu
     */
    watch(chosenAccount, async (newVal, oldVal) => {
        if (newVal !== -1) {
            selectedAccount.value = accounts.value[newVal];
            store.dispatch(
                "AccountStore/selectAccount",
                {chain: accounts.value[newVal].chain, accountID: accounts.value[newVal].accountID}
            );
        }
    }, {immediate: true});

    /*
     * Account data has changed
     */
    watch(selectedAccount, async (newVal, oldVal) => {
        if (newVal && newVal !== oldVal) {
            selectedChain.value = newVal.chain;
            accountName.value = newVal.accountName;
            accountID.value = newVal.accountID;
        }
    }, {immediate: true});
</script>

<template>
    <div v-if="accountOptions.length">
        <ui-select
            id="account_select"
            style="width:100%"
            v-model="chosenAccount"
            :options="accountOptions"
            required
            full-bleed
        >
            Account
        </ui-select>
        <AccountDetails :account="selectedAccount" />
        <Balances :account="selectedAccount" />
    </div>
    <Actionbar />
</template>
