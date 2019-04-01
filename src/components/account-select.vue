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
                <span class="option__title options">
                    {{ accountLabel(props.option) }}
                </span>
            </span>
        </template>
    </multiselect>
</template>

<script>
    import RendererLogger from "../lib/RendererLogger";
    import Multiselect from "vue-multiselect";
    const logger = new RendererLogger();
    import { blockchains } from "../config/config";

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
                selectedAccount: this.value,
                blockchains: blockchains
            };
        },
        computed: {
            accounts() {
                if (this.chain == "ANY" || this.chain == null) {
                    if (this.cta != "") {
                        return [{}]
                            .concat(this.$store.state.AccountStore.accountlist.slice())
                            .map((acc, i) => {
                                acc.trackId = `account-${i}`;
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
                    } else {
                        return this.$store.state.AccountStore.accountlist.map((acc, i) => {
                            acc.trackId = `account-${i}`;
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
                } else {
                    if (this.cta != "") {
                        return [{}]
                            .concat(
                                this.$store.state.AccountStore.accountlist.filter(
                                    x => x.chain == this.chain
                                )
                            )
                            .map((acc, i) => {
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
                    } else {
                        return this.$store.state.AccountStore.accountlist
                            .filter(x => x.chain == this.chain)
                            .map((acc, i) => {
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
                }
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
                        this.blockchains[account.chain].name +
                        (this.blockchains[account.chain].testnet ? " (Testnet)" : "") +
                        ": " +
                        account.accountName +
                        (account.accountName !== account.accountID
                            ? " (" + account.accountID + ")"
                            : "")
                    );
                }
            }
        }
    };
</script>
