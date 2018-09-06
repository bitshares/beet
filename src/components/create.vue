<template>
    <div class="bottom ">
        <div
            v-if="step==1"
            id="step1"
        >
            <h4 class="h4 mt-3 font-weight-bold">{{ $t('step_counter',{ 'step_no' : 1}) }}</h4>
            <p class="my-3 font-weight-bold">{{ $t('friendly_cta') }}</p>
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
            <div class="row">
                <div class="col-6">
                    <router-link
                        to="/"
                        tag="button"
                        class="btn btn-lg btn-primary btn-block"
                        replace
                    >{{ $t('cancel_btn') }}</router-link>
                </div>
                <div class="col-6">
                    <button
                        class="btn btn-lg btn-primary btn-block"
                        type="submit"
                        @click="step2"
                    >{{ $t('next_btn') }}</button>
                </div>
            </div>
        </div>
        <div
            v-if="step==2"
            id="step2"
        >
            <h4 class="h4 mt-3 font-weight-bold">{{ $t('step_counter',{ 'step_no' : 2}) }}</h4>
            <p class="mb-2 font-weight-bold">{{ $t('account_name',{ 'chain' : 'BTS'}) }}</p>
            <input
                id="inputAccount"
                v-model="accountname"
                type="text"
                class="form-control mb-3"
                :placeholder="$t('account_name',{ 'chain' : 'BTS'})"
                required=""
            >
            <p class="my-3 font-weight-normal">{{ $t('keys_cta') }}</p>
            <p class="mb-2 font-weight-bold">{{ $t('active_authority') }}</p>
            <input
                id="inputActive"
                v-model="activepk"
                type="text"
                class="form-control mb-3 small"
                :placeholder="$t('active_authority_placeholder')"
                required=""
            >

            <p class="mb-2 font-weight-bold">{{ $t('memo_authority') }}</p>
            <input
                id="inputMemo"
                v-model="memopk"
                type="text"
                class="form-control mb-3 small"
                :placeholder="$t('memo_authority_placeholder')"
                required=""
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
                    type="text"
                    class="form-control mb-3 small"
                    :placeholder="$t('owner_authority_placeholder')"
                    required=""
                >
            </div>
            <div class="row">
                <div class="col-6">
                    <button
                        class="btn btn-lg btn-primary btn-block"
                        type="submit"
                        @click="step1"
                    >{{ $t('back_btn') }}</button>
                </div>
                <div class="col-6">
                    <button
                        class="btn btn-lg btn-primary btn-block"
                        type="submit"
                        @click="step3"
                    >{{ $t('next_btn') }}</button>
                </div>
            </div>
        </div>
        <div
            v-if="step==3"
            id="step3"
        >
            <h4 class="h4 mt-3 font-weight-bold">{{ $t('step_counter',{ 'step_no' : 3}) }}</h4>
            <p class="mb-2 font-weight-bold">{{ $t('password_cta') }}</p>
            <input
                id="inputPass"
                v-model="password"
                type="password"
                class="form-control mb-3"
                :placeholder="$t('password_placeholder')"
                required=""
            >
            <p class="mb-2 font-weight-bold">{{ $t('confirm_cta') }}</p>
            <input
                id="inputConfirmPass"
                v-model="confirmpassword"
                type="password"
                class="form-control mb-3"
                :placeholder="$t('confirm_placeholder')"
                required=""
            >
            <button
                class="btn btn-lg btn-primary btn-block"
                type="submit"
                @click="verifyAndCreate"
            >{{ $t('next_lbl') }}</button>
        </div>
        <b-modal
            id="loaderAnim"
            ref="loaderAnimModal"
            centered
            no-close-on-esc
            no-close-on-backdrop
            hide-header
            hide-header-close
            hide-footer
            title="Loading..."
        >
            <div class="lds-roller"><div /><div /><div /><div /><div /><div /><div /><div /></div>
        </b-modal>
        <b-modal
            id="error"
            ref="errorModal"
            centered
            hide-footer
            :title="$t('error_lbl')"
        >
            {{ errorMsg }}
        </b-modal>
        <p class="mt-2 mb-2 small">&copy; 2018 BitShares</p>
    </div>
</template>

<script>
    import { PrivateKey } from "bitsharesjs";
    import { Apis } from "bitsharesjs-ws";

    export default {
        name: "Create",
        i18nOptions: { namespaces: "common" },
        data() {
            return {
                walletname: "",
                accountname: "",
                accountID: "",
                activepk: "",
                ownerpk: "",
                memopk: "",
                password: "",
                confirmpassword: "",
                step: 1,
                s1c: "",
                includeOwner: 0,
                errorMsg: ""
            };
        },
        methods: {
            step1: function() {
                this.$data.step = 1;
            },
            step2: function() {
                if (this.$data.walletname.trim() == "") {
                    console.log("Cannot create a wallet with an empty name.");
                    this.$data.errorMsg = this.$t('empty_wallet_error');
                    this.$refs.errorModal.show();
                    this.$data.s1c = "is-invalid";
                } else {
                    let wallets = JSON.parse(localStorage.getItem("wallets"));

                    if (
                        wallets &&
                        wallets.filter(wallet => wallet.name === this.$data.walletname.trim())
                        .length > 0
                    ) {
                        console.log("A wallet with this name already exists.");

                        this.$data.errorMsg = this.$t('duplicate_wallet_error');
                        this.$refs.errorModal.show();
                        this.$data.s1c = "is-invalid";
                    } else {
                        this.$data.walletname = this.$data.walletname.trim();
                        this.$data.step = 2;
                    }
                }
            },
            step3: async function() {
                let apkey, mpkey, opkey;
                if (this.$data.accountname == "") {
                    this.$data.errorMsg = this.$t('missing_account_error',{'chain': 'BTS'});
                    this.$refs.errorModal.show();
                    return;
                }
                try {
                    apkey = PrivateKey.fromWif(this.activepk)
                        .toPublicKey()
                        .toString("BTS");
                    mpkey = PrivateKey.fromWif(this.memopk)
                        .toPublicKey()
                        .toString("BTS");
                    if (this.$data.includeOwner == 1) {
                        opkey = PrivateKey.fromWif(this.ownerpk)
                            .toPublicKey()
                            .toString("BTS");
                    }
                } catch (e) {
                    console.log("Invalid Private Key format.");
                    this.$data.errorMsg = this.$t('invalid_key_error');
                    this.$refs.errorModal.show();
                    return;
                }
                this.$refs.loaderAnimModal.show();
                let verified = await Apis.instance(
                    this.$store.state.SettingsStore.settings.selected_node,
                    true
                ).init_promise.then(() => {
                    return Apis.instance()
                        .db_api()
                        .exec("get_full_accounts", [[this.accountname], false])
                        .then(res => {
                            // TODO: Better verification
                            if (
                                res[0][1].account.active.key_auths[0][0] == apkey &&
                                (res[0][1].account.owner.key_auths[0][0] == opkey ||
                                this.$data.includeOwner == 0) &&
                                res[0][1].account.options.memo_key == mpkey
                            ) {
                                console.log(
                                    "Keys verified. Account ID is: " + res[0][1].account.id
                                );
                                this.$refs.loaderAnimModal.hide();
                                return res[0][1].account.id;
                            } else {
                                console.log("Keys not verified for provided account name.");
                                this.$refs.loaderAnimModal.hide();
                                this.$refs.errorModal.show();
                                this.$data.errorMsg = this.$t('unverified_account_error');
                                return null;
                            }
                    });
                });
                if (verified != null) {
                    this.$data.accountID = verified;
                    this.$data.step = 3;
                } else {
                    return;
                }
            },
            verifyAndCreate: async function() {
                if (
                    this.$data.password != this.$data.confirmpassword ||
                    this.$data.password == ""
                ) {
                    this.$refs.errorModal.show();
                    this.$data.errorMsg = this.$t('confirm_pass_error');
                    return;
                }

                this.$refs.loaderAnimModal.show();

                if (this.$data.accountID !== null) {
                    this.$store
                        .dispatch("WalletStore/saveWallet", { walletname: this.$data.walletname, password: this.$data.password, walletdata:  {
                            accountName: this.$data.accountname,
                            accountID: this.$data.accountID,
                            keys: {
                                active: this.activepk,
                                owner: this.ownerpk,
                                memo: this.memopk
                            }
                        }
                        });
                    this.$router.replace("/dashboard");
                }
            }
        }
    };
</script>