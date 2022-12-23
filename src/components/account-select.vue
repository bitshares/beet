<script setup>
    import { watch, ref, computed } from "vue";
    import { useI18n } from 'vue-i18n';

    import store from '../store/index';
    import {formatChain, formatAccount} from "../lib/formatter";
    const { t } = useI18n({ useScope: 'global' });

    let chosenAccount = ref(store.getters["AccountStore/getCurrentIndex"]);
    let selectedAccount = ref()

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
</script>

<template>
    <div style="padding:5px">
        <ui-card
            v-shadow="1"
            outlined
            style="padding:5px; text-align: center;"
        >
            <ui-select
                v-if="accountOptions.length"
                id="account_select"
                v-model="chosenAccount"
                style="width:100%;"
                :options="accountOptions"
                required
                full-bleed
            >
                {{ t('common.account') }}
            </ui-select>
        </ui-card>
    </div>
</template>
