<script setup>
    import { watchEffect, watch, ref, onMounted, computed } from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();
    import {formatChain, formatAccount} from "../lib/formatter";
    import store from '../store/index';

    const props = defineProps({
        selectedAccount: Object,
        cta: String,
        extraclass: String,
        existing: {
            type: Array,
            default: function() {
                return [];
            }
        }
    });

    let chosenAccount = ref(0);

    let accounts = computed(() => {
      let accountList;
      try {
        accountList = store.getters['AccountStore/getAccountList'];
      } catch (error) {
        console.log(error);
        return [];
      }

      return accountList.map(account => {
        return {
          label: !account.hasOwnProperty("accountID")&& account.trackId == 0
                  ? props.cta
                  : `${formatChain(account.chain)}: ${formatAccount(account)}`,
          value: account
        };
      });
    });

    watch(chosenAccount, async (newVal, oldVal) => {
      if (newVal !== oldVal) {
          if (chosenAccount && accounts) {
            props.selectedAccount = accounts[chosenAccount].value;
          }
      }
    }, {immediate: true});

    /*
    let accounts = computed(() => {
      let computedAccounts = props.chain == "ANY" || props.chain == null
            ? store.state.AccountStore.accountlist
            : store.state.AccountStore.accountlist.filter(
                x => x.chain == props.chain
              );


      if (props.cta != "") {
          computedAccounts = [{}].concat(computedAccounts);
      }


      console.log(store.state.AccountStore)

      let finalAccounts = computedAccounts.slice().map((acc, i) => {
          acc.trackId = i;
          let match = props.existing.filter(
              x => x.account_id == acc.accountID && x.chain == acc.chain
          );
          acc.linked = match.length > 0 ? true : false;
          return acc;
      });

      console.log(finalAccounts)

      return finalAccounts;
    });
    */

    onMounted(() => {
      logger.debug("Account-Selector Mounted");
    });

</script>

<template>
    <ui-select
        id="full-func-js-select"
        v-model="chosenAccount"
        :options="accounts"
    >
        Account select
    </ui-select>
</template>
