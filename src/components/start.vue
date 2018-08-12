<template>
    <div class="bottom">
        <p class="mb-3 font-weight-normal" v-if="!hasWallet"><em>There is no wallet stored in this computer.</em></p>
        <router-link to="/create" tag="button" v-if="!hasWallet" class="btn btn-lg btn-primary btn-block" replace>Get Started</router-link>
        <p class="mb-1 mt-3 font-weight-normal"  v-if="hasWallet">Account:</p>
        <p class="mb-3 font-weight-normal"  v-if="hasWallet"><strong>{{accountName}}</strong> (<span>{{accountID}}</span>)</p>
        <input type="password" id="inputPassword" class="form-control mb-3" placeholder="Password" required="" v-model="walletpass"  v-if="hasWallet">
        <button class="btn btn-lg btn-primary btn-block" type="submit" v-if="hasWallet" v-on:click="unlockWallet">Unlock</button>
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
      walletpass: ''
    };
  },
  mounted() {
    if (localStorage.getItem("wallet")) {
      this.hasWallet = true;
      this.accountName = localStorage.getItem("accountName");
      this.accountID = localStorage.getItem("accountID");
    }
  },
  methods: {
    unlockWallet() {
      let ls = new SecureLS({encodingType: 'aes', isCompression: true, encryptionSecret: this.walletpass});
      try {
        let wallet=ls.get('wallet');
        this.$root.$data.wallet={};
        this.$root.$data.wallet.keys=wallet;
        this.$root.$data.wallet.accountID=localStorage.getItem("accountID");
        this.$root.$data.wallet.accountName=localStorage.getItem("accountName");
        
        this.$router.replace('/dashboard');
        console.log('go on');
      }catch(e) {
        console.log('show error',e);
      }
    }
  }
};
</script>