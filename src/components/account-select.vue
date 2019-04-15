<template>
    <multiselect
        id="account-select"
        v-model="selectedAccount"
        class="form-control"
        :searchable="false"
        :allow-empty="false"
        :custom-label="accountLabel"
        :options="accounts"
        track-by="trackId"
    >
        <template
            slot="option"
            slot-scope="props"
        >
            <span
                class="option__desc"
                :class="{ prevLink: props.option.linked }"
                :data-linked="$t('previously_linked')"
            >
                <span class="option__title options">{{ accountLabel(props.option) }}</span>
            </span>
        </template>
    </multiselect>
</template>

<script>
    import RendererLogger from "../lib/RendererLogger";
    import Multiselect from "vue-multiselect";
    const logger = new RendererLogger();
    import {formatChain, formatAccount} from "../lib/formatter";

    export default {
        name: "AccountSelect",
        i18nOptions: { namespaces: "common" },
        components: { Multiselect },
        props: {
            value: Object,
            chain: String,
            cta: String,
            existing: {
                type: Array,
                default: function() {
                    return [];
                }
            }
        },
        data() {
            return {
                selectedAccount: this.value
            };
        },
        computed: {
            accounts() {
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
            }
        },
        watch: {
            selectedAccount: function() {
                if (this.selectedAccount != { trackId: 0 }) {
                    this.$emit("input", this.selectedAccount);
                }
            },
            accounts: function() {
                if (this.accounts.length == 1) {
                    this.selectedAccount = this.accounts[0];
                }
                if (this.accounts.length == 2) {
                    this.selectedAccount = this.accounts[1];
                }
            },
            value: function() {
                this.selectedAccount = this.value;
            }
        },
        mounted() {

            logger.debug("Account-Selector Mounted");
        },
        methods: {
            accountLabel: function(account) {
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
        }
    };
</script>
