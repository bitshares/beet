<script setup>
    import { watchEffect, ref } from "vue";
    import RendererLogger from "../lib/RendererLogger";
    import Multiselect from "vue-multiselect";
    const logger = new RendererLogger();
    import {formatChain, formatAccount} from "../lib/formatter";

    let selectedAccount = ref(this.value);

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

    let accounts = computed(() => {
      let accounts;
      if (this.chain == "ANY" || this.chain == null) {
          accounts = this.$store.state.AccountStore.accountlist;
      } else {
          accounts = this.$store.state.AccountStore.accountlist.filter(
              x => x.chain == this.chain
          );
      }
      if (this.cta != "") {
          accounts = [{}].concat(accounts);
      }
      return accounts.slice().map((acc, i) => {
          acc.trackId = i;
          let match = this.existing.filter(
              x => x.account_id == acc.accountID && x.chain == acc.chain
          );
          if (match.length > 0) {
              acc.linked = true;
          } else {
              acc.linked = false;
          }
          return acc;
      });
    });

    onMounted(() => {
      logger.debug("Account-Selector Mounted");
    });

    function accountLabel(account) {
        if (!account.hasOwnProperty("accountID") && account.trackId == 0) {
            return this.cta;
        } else {
            return (
                formatChain(account.chain) +
                ": " +
                formatAccount(account)
            );
        }
    }

    watchEffect(() => {
      if (selectedAccount != { trackId: 0 }) {
          this.$emit("input", selectedAccount);
      }
    });

    watchEffect(() => {
      if (accounts.length == 1) {
          selectedAccount = accounts[0];
      }
      if (accounts.length == 2) {
          selectedAccount = accounts[1];
      }
    });

    watchEffect(() => {
      selectedAccount = value;
    });
</script>

<template>
    <multiselect
        id="account-select"
        v-model="selectedAccount"
        :class="'form-control '+extraclass"
        :searchable="false"
        :allow-empty="false"
        :custom-label="accountLabel"
        :options="accounts"
        track-by="trackId"
    >
        <template #option slot-scope="props">
            <span
                class="option__desc"
                :class="{ prevLink: props.option.linked }"
                :data-linked="$t('common.previously_linked')"
            >
                <span class="option__title options">{{ accountLabel(props.option) }}</span>
            </span>
        </template>
    </multiselect>
</template>
