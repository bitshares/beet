<script setup>
    import { watchEffect, ref, onMounted, computed } from "vue";
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();
    import {formatChain, formatAccount} from "../lib/formatter";

    const props = defineProps({
        value: Object,
        chain: String,
        cta: String,
        extraclass: String,
        existing: {
            type: Array,
            default: function() {
                return [];
            }
        }
    });

    let selectedAccount = ref(props.value);

    let accounts = computed(() => {
      let computedAccounts = props.chain == "ANY" || props.chain == null
            ? computedAccounts = this.$store.state.AccountStore.accountlist
            : computedAccounts = this.$store.state.AccountStore.accountlist.filter(
                x => x.chain == props.chain
            );

      if (props.cta != "") {
          computedAccounts = [{}].concat(computedAccounts);
      }

      return computedAccounts.slice().map((acc, i) => {
          acc.trackId = i;
          let match = props.existing.filter(
              x => x.account_id == acc.accountID && x.chain == acc.chain
          );
          acc.linked = match.length > 0 ? true : false;
          return acc;
      });
    });

    onMounted(() => {
      logger.debug("Account-Selector Mounted");
    });

    function accountLabel(account) {
        if (!account.hasOwnProperty("accountID") && account.trackId == 0) {
            return props.cta;
        } else {
            return (
                formatChain(account.chain) +
                ": " +
                formatAccount(account)
            );
        }
    }

    watchEffect(() => {
      if (selectedAccount.value != { trackId: 0 }) {
          this.$emit("input", selectedAccount.value);
      }
    });

    watchEffect(() => {
      if (accounts.value.length == 1) {
          selectedAccount.value = accounts.value[0];
      }
      if (accounts.value.length == 2) {
          selectedAccount.value = accounts.value[1];
      }
    });

    watchEffect(() => {
      selectedAccount.value = props.value;
    });

</script>

<template>
    <section :dir="null">
        <ui-select
            id="full-func-js-select"
            v-model="selectedAccount"
            :options="accounts"
            :label="accountLabel"
            :class="{ prevLink: props.option.linked }"
            :data-linked="$t('common.previously_linked')"
            :disabled="false"
            @selected="onSelected($event)"
            track-by="trackId"
        >
            Language select
        </ui-select>
    </section>
</template>
