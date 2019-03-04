<template>
    <div class="bottom">
        <div
            v-if="step==1"
            id="step1"
        >
            <h4 class="h4 mt-3 font-weight-bold">
                {{ $t('step_counter',{ 'step_no' : 1}) }}
            </h4>

            <p class="my-3 font-weight-bold">
                {{ $t('chain_new_cta') }}
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
            <div class="row">
                <div class="col-6">
                    <router-link
                        to="/dashboard"
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
            v-if="step==2"
            id="step2"
        >
            <h4 class="h4 mt-3 font-weight-bold">
                {{ $t('step_counter',{ 'step_no' : 2}) }}
            </h4>
            <p class="mb-2 font-weight-bold">
                {{ $t('account_name',{ 'chain' : selectedChain}) }}
            </p>
            <input
                id="inputAccount"
                v-model="accountname"
                type="text"
                class="form-control mb-3"
                :placeholder="$t('account_name',{ 'chain' : selectedChain})"
                required
            >
            <p class="my-3 font-weight-normal">
                {{ $t('keys_cta') }}
            </p>
            <p class="mb-2 font-weight-bold">
                {{ $t('active_authority') }}
            </p>
            <input
                id="inputActive"
                v-model="activepk"
                type="password"
                class="form-control mb-3 small"
                :placeholder="$t('active_authority_placeholder')"
                required
            >

            <p class="mb-2 font-weight-bold">
                {{ $t('memo_authority') }}
            </p>
            <input
                id="inputMemo"
                v-model="memopk"
                type="password"
                class="form-control mb-3 small"
                :placeholder="$t('memo_authority_placeholder')"
                required
            >
            <b-form-checkbox
                id="incOwnerCB"
                v-model="includeOwner"
                value="1"
                unchecked-value="0"
                class="mb-3"
            >
                {{ $t('include_owner_check') }}
            </b-form-checkbox>
            <div v-if="includeOwner==1">
                <input
                    id="inputOwner"
                    v-model="ownerpk"
                    type="password"
                    class="form-control mb-3 small"
                    :placeholder="$t('owner_authority_placeholder')"
                    required
                >
            </div>
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
                @click="verifyAndCreate"
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
    import { EventBus } from "../lib/event-bus.js";
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    export default {
        name: "AddAccount",
        i18nOptions: { namespaces: "common" },
        data() {
            return {
                accountname: "",
                accountID: "",
                activepk: "",
                ownerpk: "",
                memopk: "",
                password: "",
                step: 1,
                s1c: "",
                includeOwner: 0,
                errorMsg: "",
                selectedChain: 0,
                chainList: Object.values(blockchains)
            };
        },
        mounted() {
            logger.debug('Account-Add wizard Mounted');
        },
        methods: {
            step1: function() {
                this.step = 1;
            },
            step2: function() {
                this.step = 2;
            },
            step3: async function() {
                let apkey, mpkey, opkey;
                if (this.accountname == "") {
                    this.errorMsg = this.$t("missing_account_error", {
                        chain: this.selectedChain
                    });
                    this.$refs.errorModal.show();
                    return;
                }

                let blockchain = getBlockchain(this.selectedChain);

                try {
                    apkey = blockchain.getPublicKey(this.activepk);
                    mpkey = blockchain.getPublicKey(this.memopk);
                    if (this.includeOwner == 1) {
                        opkey = blockchain.getPublicKey(this.ownerpk);
                    }
                } catch (e) {
                    this.errorMsg = this.$t("invalid_key_error");
                    this.$refs.errorModal.show();
                    return;
                }
                EventBus.$emit("popup", "load-start");

                blockchain
                    .getAccount(this.accountname)
                    .then(account => {                        
                        let active_check = false;
                        account.active.public_keys.forEach(key => {
                            if (key[0] == apkey) {
                                active_check = true;
                            }
                        });
                        let owner_check = !this.includeOwner;
                        account.owner.public_keys.forEach(key => {
                            if (key[0] == opkey) {
                                owner_check = true;
                            }
                        });
                        let memo_check = account.memo.public_key == mpkey;
                        if (active_check && owner_check && memo_check) {
                            EventBus.$emit("popup", "load-end");
                            this.accountID = account.id;
                            this.step = 3;
                        } else {
                            EventBus.$emit("popup", "load-end");
                            this.$refs.errorModal.show();
                            this.errorMsg = this.$t("unverified_account_error");
                            this.accountID = "";
                        }
                    })
                    .catch(err => {
                        EventBus.$emit("popup", "load-end");
                        this.$refs.errorModal.show();
                        this.errorMsg = this.$t("unverified_account_error");
                        this.accountID = "";
                    });
            },
            verifyAndCreate: async function() {
                if (this.password == "") {
                    this.$refs.errorModal.show();
                    this.errorMsg = this.$t("empty_pass_error");
                    return;
                }

                EventBus.$emit("popup", "load-start");

                if (this.accountID !== null) {
                    this.$store
                        .dispatch("AccountStore/addAccount", {
                            password: this.password,
                            account: {
                                accountName: this.accountname,
                                accountID: this.accountID,
                                chain: this.selectedChain,
                                keys: {
                                    active: this.activepk,
                                    owner: this.ownerpk,
                                    memo: this.memopk
                                }
                            }
                        })
                        .then(() => {
                            this.$router.replace("/dashboard");
                        }).catch((e) => {
                            EventBus.$emit("popup", "load-end");
                            if (e=='invalid') {
                                this.$refs.errorModal.show();
                                this.errorMsg = this.$t("invalid_password");
                            }
                            if (e=='update_failed') {
                                this.$refs.errorModal.show();
                                this.errorMsg = this.$t("update_failed");
                            }
                        });
                }
            }
        }
    };
</script>