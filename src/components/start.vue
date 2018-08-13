<template>
    <div class="bottom">
        <p class="mb-3 font-weight-normal" v-if="!hasWallet"><em>There is no wallet stored in this computer.</em></p>
        <router-link to="/create" tag="button" v-if="!hasWallet" class="btn btn-lg btn-primary btn-block" replace>Get Started</router-link>        
        <select class="custom-select" id="wallet-select" v-model="selectedWallet"  v-if="hasWallet">                                
          <option selected disabled value="0">Select Wallet:</option>
          <option v-for="wallet in walletlist" v-bind:value="wallet.id" v-bind:key="wallet.id">{{wallet.name}}</option>
        </select>
        <input type="password" id="inputPassword" class="form-control mb-3" placeholder="Password" required="" v-model="walletpass"  v-if="hasWallet">
        <button class="btn btn-lg btn-primary btn-block" type="submit" v-if="hasWallet" v-on:click="unlockWallet">Unlock</button>
        <p class="mb-3 font-weight-normal" v-if="hasWallet"><em>or</em></p>
        <router-link to="/create" tag="button" v-if="hasWallet" class="btn btn-lg btn-primary btn-block" replace>Create a new wallet</router-link>     
        <p class="mt-5 mb-3">&copy; 2017-2018</p>
    </div>
</template>
<script>
import SecureLS from 'secure-ls';

export default { 
  name: "start",
  data() {
    return {
      hasWallet: false,
      walletpass: '',
      walletlist: [],
      selectedWallet: '0'
    };
  },
  mounted() {
    let wallets=JSON.parse(localStorage.getItem("wallets"));
    if (wallets && wallets.length>0) {
      this.$data.hasWallet = true;
      this.$data.walletlist=wallets;
      console.log(wallets);
      //this.accountName = localStorage.getItem("accountName");
      //this.accountID = localStorage.getItem("accountID");
    }
  },
  methods: {
    unlockWallet() {
      let ls = new SecureLS({encodingType: 'aes', isCompression: true, encryptionSecret: this.walletpass});
      try {
        let wallet=ls.get(this.selectedWallet);
        
        this.$root.$data.wallet=wallet;
        
        this.$router.replace('/dashboard');
        console.log('go on');
      }catch(e) {
        console.log('show error',e);
      }
    }
  }
};
</script>