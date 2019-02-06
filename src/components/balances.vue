<template>
    <div class="balances mt-3">
        <p class="mb-1 font-weight-bold small">{{ $t('balances_lbl') }}</p>
        <table class="table small table-striped table-sm">
            <tbody v-if="balances != null">
                <tr
                    v-for="balance in balances"
                    :key="balance.id"
                >
                    <td class="text-left"><span class="small">{{ balance.prefix }}</span>{{ balance.asset_name }}</td>
                    <td class="text-right">{{ balance.balance }}</td>
                </tr>
                <tr v-if="balances.length == 0">
                    <td class="text-left"><span class="small" />No balances</td>
                    <td class="text-right">-</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
<script>
    import getBlockchain from "../lib/blockchains/blockchainFactory"

    export default {
        name: "Balances",
        i18nOptions: { namespaces: "common" },
        data() {
            return {
                balances: null
            };
        },
        mounted() {},
        methods: {
            getBalances: function() {
                let blockchain = getBlockchain(this.$store.state.WalletStore.wallet.chain);
                blockchain.getBalances(this.$store.state.WalletStore.wallet.accountName).then((balances) => {
                    this.balances = balances;
                });
            },
            formatMoney: function(n, decimals, decimal_sep, thousands_sep) {
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
        }
    };
</script>
