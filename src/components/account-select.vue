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

    /*
     * Retrieve the list of accounts for allocation to prop
     */
    let accounts = computed(() => {
      let accountList;
      try {
        accountList = store.getters['AccountStore/getAccountList'];
      } catch (error) {
        console.log(error);
        return [];
      }
      return accountList;
    });

    /*
     * Creating the select items
     */
    let accountOptions = computed(() => {
      let accountList;
      try {
        accountList = store.getters['AccountStore/getAccountList'];
      } catch (error) {
        console.log(error);
        return [];
      }

      let options = accountList.map((account, i) => {
        return {
          label: !account.hasOwnProperty("accountID") && account.trackId == 0
                  ? props.cta
                  : `${formatChain(account.chain)}: ${formatAccount(account)}`,
          value: i
        };
      });

      return options;
    });

    watch(chosenAccount, (newVal, oldVal) => {
      if (newVal !== oldVal) {
          if (chosenAccount && accounts) {
            props.selectedAccount = accounts.value[newVal];
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
  <div v-if="accountOptions && accountOptions.length">
      <select
          id="account_select"
          v-model="chosenAccount"
          class="form-control mb-3"
          required
      >
          <option selected disabled value="0">
              Account select
          </option>
          <option
              v-for="account in accountOptions"
              :key="account.value"
              :value="account.label"
          >
            <span>
              {{ account.label }}
            </span>
          </option>
      </select>
  </div>
  <div v-else>
      No accounts to display
  </div>
</template>
