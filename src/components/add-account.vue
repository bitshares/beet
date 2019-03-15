<template>
    <div class="bottom">
        <div
            v-if="step==1"
            id="step1"
        >
            <h4 class="h4 mt-3 font-weight-bold">
                {{ $t('step_counter',{ 'step_no' : 1}) }}
            </h4>
            <template v-if="createNewWallet">
                <p
                    v-b-tooltip.hover
                    :title="$t('tooltip_friendly_cta')"
                    class="my-3 font-weight-bold"
                >
                    {{ $t('friendly_cta') }} &#10068;
                </p>
                <input
                    id="inputWallet"
                    v-model="walletname"
                    type="text"
                    class="form-control mb-3"
                    :class="s1c"
                    :placeholder="$t('walletname_placeholder')"
                    required=""
                    @focus="s1c=''"
                >
            </template>
            <p
                v-b-tooltip.hover
                :title="$t('tooltip_chain_cta')"
                class="my-3 font-weight-bold"
            >
                {{ $t('chain_new_cta') }} &#10068;
            </p>
            <select
                id="chain-select"
                v-model="selectedChain"
                class="form-control mb-3"
                :class="s1c"
                :placeholder="$t('chain_placeholder')"
                required
            >
                <option
                    selected
                    disabled
                    value="0"
                >
                    {{ $t('select_chain') }}
                </option>
                <option
                    v-for="chain in chainList"
                    :key="chain.short"
                    :value="chain.short"
                >
                    {{ chain.name }} ({{ chain.short }})
                </option>
            </select>
            <div v-if="selectedChain=='BTS'">
                <p class="my-3 font-weight-bold">
                    {{ $t('bts_importtype_cta') }}
                </p>
                <select
                    id="import-select"
                    v-model="BTSImportType"
                    class="form-control mb-3"
                    :class="s1c"
                    :placeholder="$t('import_placeholder')"
                    required
                >
                    <option
                        selected
                        disabled
                        value="0"
                    >
                        {{ $t('import_placeholder') }}
                    </option>
                    <option
                        value="1"
                    >
                        {{ $t('import_keys') }}
                    </option>
                    <option
                        value="2"
                    >
                        {{ $t('import_pass') }}
                    </option>                
                    <option
                        value="3"
                    >
                        {{ $t('import_bin') }}
                    </option>
                </select>
            </div>
            <div class="row">
                <div class="col-6">
                    <router-link
                        :to="createNewWallet ? '/' : '/dashboard'"
                        tag="button"
                        class="btn btn-lg btn-primary btn-block"
                        replace
                    >
                        {{ $t('cancel_btn') }}
                    </router-link>
                </div>
                <div class="col-6">
                    <button
                        class="btn btn-lg btn-primary btn-block"
                        type="submit"
                        @click="step2"
                    >
                        {{ $t('next_btn') }}
                    </button>
                </div>
            </div>
        </div>
        <div
            v-else-if="step==2"
            id="step2"
        >
            <ImportKeys
                v-if="selectedChain != 'BTS' || BTSImportType=='1'"
                ref="import_bitshares_accounts"
                :selectedChain="selectedChain"
            />
            <ImportCloudPass
                v-else-if="selectedChain=='BTS' && BTSImportType=='2'"
                ref="import_bitshares_accounts"
                :selectedChain="selectedChain"
            />
            <ImportBinFile
                v-else="selectedChain=='BTS' && BTSImportType=='3'"
                ref="import_bitshares_accounts"
                :selectedChain="selectedChain"
            />
            <div class="row">
                <div class="col-6">
                    <button
                        class="btn btn-lg btn-primary btn-block"
                        type="submit"
                        @click="step1"
                    >
                        {{ $t('back_btn') }}
                    </button>
                </div>
                <div class="col-6">
                    <button
                        class="btn btn-lg btn-primary btn-block"
                        type="submit"
                        @click="step3"
                    >
                        {{ $t('next_btn') }}
                    </button>
                </div>
            </div>
        </div>
        <div
            v-if="step==3"
            id="step3"
        >
            <h4 class="h4 mt-3 font-weight-bold">
                {{ $t('step_counter',{ 'step_no' : 3}) }}
            </h4>
            <p class="mb-2 font-weight-bold">
                {{ $t('password_req_cta') }}
            </p>
            <input
                id="inputPass"
                v-model="password"
                type="password"
                class="form-control mb-3"
                :placeholder="$t('password_placeholder')"
                required
            >
            <button
                class="btn btn-lg btn-primary btn-block"
                type="submit"
                @click="addAccounts"
            >
                {{ $t('next_btn') }}
            </button>
        </div>
        <b-modal
            id="error"
            ref="errorModal"
            centered
            hide-footer
            :title="$t('error_lbl')"
            e
        >
            {{ errorMsg }}
        </b-modal>
        <p class="mt-2 mb-2 small">
            &copy; 2019 BitShares
        </p>
    </div>
</template>

<script>
    import { blockchains } from "../config/config.js";
    import getBlockchain from "../lib/blockchains/blockchainFactory";

    import ImportCloudPass from "./blockchains/bitshares/ImportCloudPass";
    import ImportBinFile from "./blockchains/bitshares/ImportBinFile";
    import ImportKeys from "./blockchains/ImportKeys";

    import { EventBus } from "../lib/event-bus.js";

    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    export default {
        name: "AddAccount",
        components: {ImportKeys, ImportCloudPass, ImportBinFile},
        i18nOptions: { namespaces: "common" },
        data() {
            return {
                walletname: "",
                accountname: "",
                password: "",
                step: 1,
                s1c: "",
                includeOwner: 0,
                errorMsg: "",
                selectedChain: 0,
                BTSImportType: 0,
                chainList: Object.values(blockchains),
            };
        },
        computed: {
            createNewWallet() {
                return !this.$store.state.WalletStore.isUnlocked;
            }
        },
        mounted() {
            logger.debug('Account-Add wizard Mounted');
        },
        methods: {
            step1: function() {
                this.step = 1;
            },
            step2: function() {
                if (this.walletname.trim() == "") {
                    this.errorMsg = this.$t("empty_wallet_error");
                    this.$refs.errorModal.show();
                    this.s1c = "is-invalid";
                } else {
                    let wallets = JSON.parse(localStorage.getItem("wallets"));

                    if (
                        wallets &&
                        wallets.filter(wallet => wallet.name === this.walletname.trim())
                            .length > 0
                    ) {
                        this.errorMsg = this.$t("duplicate_wallet_error");
                        this.$refs.errorModal.show();
                        this.s1c = "is-invalid";
                    } else {
                        this.walletname = this.walletname.trim();
                        this.step = 2;
                    }
                }



                this.step = 2;
            },
            step3: async function() {
                EventBus.$emit("popup", "load-start");
                try {
                    let blockchain = getBlockchain(this.selectedChain);
                    // abstract UI concept more
                    if (blockchain.getAccessType() == "account") {
                        this.accounts_to_import = await this.$refs.import_bitshares_accounts.getAccountEvent();
                    } else {
                        let authorities = {
                            active: this.activepk
                        };
                        let account = await blockchain.verifyAccount(this.accountname, authorities);
                        this.accounts_to_import = [ account ];
                    }
                    EventBus.$emit("popup", "load-end");
                    if (this.accounts_to_import != null) {
                        // if import accounts are filled, advance to next step. If not, it is a substep in the
                        // import component
                        this.step = 3;
                    }
                } catch (err) {
                    this._handleError(err);
                } finally {
                    EventBus.$emit("popup", "load-end");
                }
            },
            _handleError(err) {
                if (err == 'invalid') {
                    this.errorMsg = this.$t("invalid_password");
                } else if (err == 'update_failed') {
                    this.errorMsg = this.$t("update_failed");
                } else if (err.key) {
                    this.errorMsg = this.$t(err.key);
                } else {
                    this.errorMsg = err.toString();
                }
                this.$refs.errorModal.show();
            },
            addAccounts: async function() {
                if (this.password == "") {
                    this.$refs.errorModal.show();
                    this.errorMsg = this.$t("empty_pass_error");
                    return;
                }
                EventBus.$emit("popup", "load-start");
                try {
                    if (!!this.accounts_to_import) {
                        for (let i in this.accounts_to_import) {
                            let account = this.accounts_to_import[i];
                            account.password = this.password;
                            account.walletname = this.walletname;
                            await this.$store.dispatch("AccountStore/addAccount", account);

                        }
                        this.$router.replace("/dashboard");
                    } else {
                        throw "No account selected!";
                    }
                } catch (err) {
                    this._handleError(err);
                } finally {
                    EventBus.$emit("popup", "load-end");
                }
            }
        }
    };
</script>