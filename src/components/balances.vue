<script setup>
    import { watch, ref, computed, onMounted } from "vue";
    import getBlockchain from "../lib/blockchains/blockchainFactory";
    import { EventBus } from "../lib/event-bus.js";
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    let balances = ref(null);
    let errored = ref(false);

    let selectedAccount = computed(() => {
      return this.$store.state.AccountStore.accountlist[
          this.$store.state.AccountStore.selectedIndex
      ];
    });

    let selectedChain = computed(() => {
      return selectedAccount.chain;
    });

    let accountName = computed(() => {
      return selectedAccount.accountName;
    });

    let accountID = computed(() => {
      return selectedAccount.accountID;
    });

    let accountlist = computed(() => {
      return this.$store.state.AccountStore.accountlist;
    });

    onMounted(() => {
      logger.debug("Balances Table Mounted");
    });

    watch(selectedAccount, async (newAcc, oldAcc) => {
      if (
          newAcc.chain != oldAcc.chain ||
          newAcc.accountID != oldAcc.accountID
      ) {
          await this.getBalances();
          EventBus.$emit("balances", "loaded");
      }
    },{immediate:true});

    async function getBalances() {
        let blockchain;
        try {
            blockchain = getBlockchain(this.selectedChain);
        } catch (error) {
            console.error(error);
            errored = true;
            return;
        }

        let retrievedBalance;
        try {
            retrievedBalance = await blockchain.getBalances(this.accountName);
        } catch (error) {
            console.error(error);
            errored = true;
            return;
        }

        if (retrievedBalance) {
          balances = retrievedBalance;
        }
    }

    function formatMoney(n, decimals, decimal_sep, thousands_sep) {
        var c = isNaN(decimals) ? 2 : Math.abs(decimals),
            d = decimal_sep || ".",
            t = typeof thousands_sep === "undefined" ? "," : thousands_sep,
            sign = n < 0 ? "-" : "",
            i = parseInt((n = Math.abs(n).toFixed(c))) + "",
            j = (j = i.length) > 3 ? j % 3 : 0;
        return (
            sign +
            (j ? i.substr(0, j) + t : "") +
            i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) +
            (c
                ? d +
                    Math.abs(n - i)
                        .toFixed(c)
                        .slice(2)
                : "")
        );
    }
</script>

<template>
    <div class="balances mt-3">
        <p class="mb-1 font-weight-bold small">
            {{ $t('common.balances_lbl') }}
        </p>
        <table class="table small table-striped table-sm">
            <span v-if="errored.value">
                {{ $t('common.balances_error') }}
            </span>
            <tbody v-if="balances.value != null">
                <tr
                    v-for="balance in balances.value"
                    :key="balance.id"
                >
                    <td class="text-left">
                        <span class="small">{{ balance.prefix }}</span>
                        {{ balance.asset_name }}
                    </td>
                    <td class="text-right">
                        {{ balance.balance }}
                    </td>
                </tr>
                <tr v-if="balances.length == 0">
                    <td class="text-left">
                        <span class="small" />No balances
                    </td>
                    <td class="text-right">
                        -
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
