<template>
    <div class="bottom">
      <div class="content">
        <p class="mt-3 mb-3 font-weight-normal" v-if="!hasWallet"><em>There is no wallet stored in this computer.</em></p>
        <router-link to="/create" tag="button" v-if="!hasWallet" class="btn btn-lg btn-primary btn-block" replace>Get Started</router-link>        
        <select class="form-control my-3" id="wallet-select" v-model="selectedWallet"  v-if="hasWallet" v-on:change="passincorrect=''">                                
          <option selected disabled value="0">Select Wallet:</option>
          <option v-for="wallet in walletlist" v-bind:value="wallet.id" v-bind:key="wallet.id">{{wallet.name}}</option>
        </select>
        <input type="password" id="inputPassword" class="form-control mb-3" placeholder="Password" required="" v-model="walletpass"  v-if="hasWallet" v-bind:class="passincorrect" v-on:focus="passincorrect=''">        
        <button class="btn btn-lg btn-primary btn-block" type="submit" v-if="hasWallet" v-on:click="unlockWallet">Unlock</button>
        <p class="my-2 font-weight-normal" v-if="hasWallet"><em>or</em></p>
        <router-link to="/create" tag="button" v-if="hasWallet" class="btn btn-lg btn-primary btn-block" replace>Create a new wallet</router-link>     
        </div>
        <b-modal id="error" centered ref="errorModal"  hide-footer title="Error">
        {{errorMsg}}
        </b-modal>
        <p class="mt-2 mb-2 small">&copy; 2018 BitShares</p>
    </div>
</template>
<script>
import SecureLS from "secure-ls";

export default {
  name: "start",
  data() {
    return {
      hasWallet: false,
      walletpass: "",
      walletlist: [],
      selectedWallet: "0",
      passincorrect: "",
      errorMsg: ""
    };
  },
  mounted() {
    let wallets = JSON.parse(localStorage.getItem("wallets"));
    if (wallets && wallets.length > 0) {
      this.$data.hasWallet = true;
      this.$data.walletlist = wallets;
    }
  },
  methods: {
    unlockWallet() {
      let ls = new SecureLS({
        encodingType: "aes",
        isCompression: true,
        encryptionSecret: this.walletpass
      });
      try {
        let wallet = ls.get(this.selectedWallet);

        this.$root.$data.wallet = wallet;

        this.$router.replace("/dashboard");
        console.log("Password accepted!");
      } catch (e) {
        this.$data.passincorrect = "is-invalid";

        this.$data.errorMsg = "Invalid Password.";
        this.$refs.errorModal.show();
        console.log("Error: Wrong Password");
      }
    }
  }
};
</script>