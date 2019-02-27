<template>
    <div class="bottom">
        <div class="content">
            <p
                v-if="!hasWallet"
                class="mt-3 mb-3 font-weight-normal"
            >
                <em>{{ $t('no_wallet') }}</em>
            </p>
            <router-link
                v-if="!hasWallet"
                to="/create"
                tag="button"
                class="btn btn-lg btn-primary btn-block"
                replace
            >
                {{ $t('start_cta') }}
            </router-link>
            
            <span
                v-if="hasWallet"
                class="icon-account"
            />
            <select
                v-if="hasWallet"
                id="wallet-select"
                v-model="selectedWallet"
                class="form-control my-3"
                @change="passincorrect=''"
            >
                <option
                    selected
                    disabled
                    value="0"
                >
                    {{ $t('select_wallet') }}
                </option>
                <option
                    v-for="wallet in walletlist"
                    :key="wallet.id"
                    :value="wallet.id"
                >
                    {{ wallet.name }}
                </option>
            </select><br>
            <span
                v-if="hasWallet"
                class="icon-lock1"
            />
            <input
                v-if="hasWallet"
                id="inputPassword"
                v-model="walletpass"
                type="password"
                class="form-control mb-4"
                :placeholder=" $t('password_placeholder')"
                required=""
                :class="passincorrect"
                @focus="passincorrect=''"
            >
            <button
                v-if="hasWallet"
                class="btn btn-lg btn-primary btn-block"
                type="submit"
                @click="unlockWallet"
            >
                {{ $t('unlock_cta') }}
            </button>
            <p
                v-if="hasWallet"
                class="my-2 font-weight-normal"
            >
                <em>{{ $t('or') }}</em>
            </p>
            <router-link
                v-if="hasWallet"
                to="/create"
                tag="button"
                class="btn btn-lg btn-primary btn-block"
                replace
            >
                {{ $t('create_cta') }}
            </router-link>
        </div>
        <b-modal
            id="error"
            ref="errorModal"
            centered
            hide-footer
            title="Error"
        >
            {{ errorMsg }}
        </b-modal>
        <p class="mt-2 mb-2 small">
            &copy; 2019 BitShares
        </p>
    </div>
</template>
<script>

    export default {
        name: "Start",
        i18nOptions: { namespaces: "common" },
        data() {
            return {
                walletpass: "",
                selectedWallet: "0",
                passincorrect: "",
                errorMsg: ""
            };
        },
        computed: {
            hasWallet() {
                return this.$store.state.WalletStore.hasWallet;
            },
            walletlist() {
                return this.$store.state.WalletStore.walletlist;
            }
        },
        mounted() {
            this.$store.dispatch("WalletStore/loadWallets", {}).catch( ()=> {
                
            });
        },
        methods: {
            unlockWallet() {
                this.$store
                    .dispatch("WalletStore/getWallet", {
                        wallet_id: this.selectedWallet,
                        wallet_pass: this.walletpass
                    })
                    .then(() => {
                        this.$router.replace("/dashboard");
                    })
                    .catch(() => {
                        this.passincorrect = "is-invalid";
                        this.errorMsg = "Invalid Password.";
                        this.$refs.errorModal.show();
                    });
            }
        }
    };
</script>