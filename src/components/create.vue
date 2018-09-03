<template>
        <div class="bottom ">
        <div id="step1" v-if="step==1">
        <h4 class="h4 mt-3 font-weight-bold">Step 1</h4>        
        <p class="my-3 font-weight-bold">Set a friendly name for your new wallet:</p>
        <input type="text" id="inputWallet" class="form-control mb-3" v-bind:class="s1c" placeholder="Wallet Name" required="" v-model="walletname" v-on:focus="s1c=''">
         <div class="row">
          <div class="col-6">
            <router-link to="/" tag="button" class="btn btn-lg btn-primary btn-block" replace>Cancel</router-link>     
          </div>
          <div class="col-6">
            <button class="btn btn-lg btn-primary btn-block" type="submit" v-on:click="step2">Next</button>
          </div>
        </div>
        </div>
        <div id="step2"  v-if="step==2">
        <h4 class="h4 mt-3 font-weight-bold">Step 2</h4>        
        <p class="mb-2 font-weight-bold">Account Name</p>
        <input type="text" id="inputAccount" class="form-control mb-3" placeholder="BTS Account Name" required="" v-model="accountname">
        <p class="my-3 font-weight-normal">Please enter the private keys for your account below:</p>
        <p class="mb-2 font-weight-bold">Active Authority</p>
        <input type="text" id="inputActive" class="form-control mb-3 small" placeholder="Active Private Key" required="" v-model="activepk">
        
        <p class="mb-2 font-weight-bold">Memo Key</p>
        <input type="text" id="inputMemo" class="form-control mb-3 small" placeholder="Memo Private Key" required="" v-model="memopk">
        <b-form-checkbox id="incOwnerCB"
                     v-model="includeOwner"
                     value="1"
                     unchecked-value="0" class="mb-3">
      Include Owner Key?
    </b-form-checkbox>
    <div v-if="includeOwner==1">        
        <input type="text" id="inputOwner" class="form-control mb-3 small" placeholder="Owner Private Key" required=""  v-model="ownerpk">
        </div>
        <div class="row">
          <div class="col-6">
            <button class="btn btn-lg btn-primary btn-block" type="submit" v-on:click="step1">Back</button>
          </div>
          <div class="col-6">
            <button class="btn btn-lg btn-primary btn-block" type="submit" v-on:click="step3">Next</button>
          </div>
        </div>
        </div>
        <div id="step3"  v-if="step==3">
        <h4 class="h4 mt-3 font-weight-bold">Step 3</h4>   
        <p class="mb-2 font-weight-bold">Set a password for this wallet:</p>
        <input type="password" id="inputPass" class="form-control mb-3" placeholder="Password" required="" v-model="password">
        <p class="mb-2 font-weight-bold">Confirm password:</p>
        <input type="password" id="inputConfirmPass" class="form-control mb-3" placeholder="Confirm Password" required="" v-model="confirmpassword">
        <button class="btn btn-lg btn-primary btn-block" type="submit" v-on:click="verifyAndCreate">Next</button>
        </div>
        <b-modal id="loaderAnim" centered ref="loaderAnimModal" no-close-on-esc no-close-on-backdrop hide-header hide-header-close hide-footer title="Loading...">
        <div class="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
        </b-modal>
        <b-modal id="error" centered ref="errorModal"  hide-footer title="Error">
        {{errorMsg}}
        </b-modal>
        <p class="mt-2 mb-2 small">&copy; 2018 BitShares</p>        
        </div>        
</template>

<script>
import { PrivateKey, key } from "bitsharesjs";
import { Apis } from "bitsharesjs-ws";
import SecureLS from "secure-ls";

export default {
  name: "create",
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
        this.$data.errorMsg = "Cannot create a wallet with an empty name.";
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

          this.$data.errorMsg = "A wallet with this name already exists.";
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
        this.$data.errorMsg = "You must specify your BTS account name.";
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
        this.$data.errorMsg = "Invalid Private Key format.";
        this.$refs.errorModal.show();
        return;
      }
      this.$refs.loaderAnimModal.show();
      let verified = await Apis.instance(
        "wss://bts-seoul.clockwork.gr",
        true
      ).init_promise.then(res => {
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
              this.$data.errorMsg =
                "Keys not verified for provided account name. Please check.";
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
        this.$data.errorMsg = "Passwords do not match!";
        return;
      }

      this.$refs.loaderAnimModal.show();
      
      if (this.$data.accountID !== null) {
       this.$store
        .dispatch("BeetStore/saveWallet", { walletname: this.$data.walletname, password: this.$data.password, walletdata:  {
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