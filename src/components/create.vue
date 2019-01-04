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
            <p class="my-3 font-weight-bold">{{ $t('chain_cta') }}</p>
            <select                
                id="chain-select"
                v-model="selectedChain"
                class="form-control mb-3"
                :class="s1c"
                :placeholder="$t('chain_placeholder')"
                required=""
            >
                <option
                    selected
                    disabled
                    value="0"
                >{{ $t('select_chain') }}</option>
                <option
                    v-for="chain in chainList"
                    :key="chain.short"
                    :value="chain.short"
                >{{ chain.name }} ({{ chain.short }})</option>
            </select>
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
            <p class="mb-2 font-weight-bold">{{ $t('account_name',{ 'chain' : selectedChain}) }}</p>
            <input
                id="inputAccount"
                v-model="accountname"
                type="text"
                class="form-control mb-3"
                :placeholder="$t('account_name',{ 'chain' : selectedChain})"
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
            >{{ $t('next_btn') }}</button>
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
import { chainList } from "../config/config.js";
import RendererLogger from "../lib/RendererLogger";

const logger = new RendererLogger();

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
      errorMsg: "",
      selectedChain: 0,
      chainList: chainList
    };
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
      try {
        apkey = PrivateKey.fromWif(this.activepk)
          .toPublicKey()
          .toString(this.selectedChain);
        mpkey = PrivateKey.fromWif(this.memopk)
          .toPublicKey()
          .toString(this.selectedChain);
        if (this.includeOwner == 1) {
          opkey = PrivateKey.fromWif(this.ownerpk)
            .toPublicKey()
            .toString(this.selectedChain);
        }
      } catch (e) {
        this.errorMsg = this.$t("invalid_key_error");
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
                this.includeOwner == 0) &&
              res[0][1].account.options.memo_key == mpkey
            ) {
              this.$refs.loaderAnimModal.hide();
              return res[0][1].account.id;
            } else {
              this.$refs.loaderAnimModal.hide();
              this.$refs.errorModal.show();
              this.errorMsg = this.$t("unverified_account_error");
              return null;
            }
          });
      });
      if (verified != null) {
        this.accountID = verified;
        this.step = 3;
      } else {
        return;
      }
    },
    verifyAndCreate: async function() {
      if (this.password != this.confirmpassword || this.password == "") {
        this.$refs.errorModal.show();
        this.errorMsg = this.$t("confirm_pass_error");
        return;
      }

      this.$refs.loaderAnimModal.show();

      if (this.accountID !== null) {
        this.$store.dispatch("WalletStore/saveWallet", {
          walletname: this.walletname,
          password: this.password,
          walletdata: {
            accountName: this.accountname,
            accountID: this.accountID,
            chain: this.selectedChain,
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