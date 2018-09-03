<template>
    <div class="bottom">
      <div class="content">
        <p class="mt-3 mb-3 font-weight-normal" v-if="!hasWallet"><em>{{ $t('no_wallet') }}</em></p>
        <router-link to="/create" tag="button" v-if="!hasWallet" class="btn btn-lg btn-primary btn-block" replace>{{ $t('start_cta') }}</router-link>        
        <select class="form-control my-3" id="wallet-select" v-model="selectedWallet"  v-if="hasWallet" v-on:change="passincorrect=''">                                
          <option selected disabled value="0">{{ $t('select_wallet') }}</option>
          <option v-for="wallet in walletlist" v-bind:value="wallet.id" v-bind:key="wallet.id">{{wallet.name}}</option>
        </select>
        <input type="password" id="inputPassword" class="form-control mb-3" :placeholder=" $t('password_placeholder')" required="" v-model="walletpass"  v-if="hasWallet" v-bind:class="passincorrect" v-on:focus="passincorrect=''">        
        <button class="btn btn-lg btn-primary btn-block" type="submit" v-if="hasWallet" v-on:click="unlockWallet">{{ $t('unlock_cta') }}</button>
        <p class="my-2 font-weight-normal" v-if="hasWallet"><em>{{ $t('or') }}</em></p>
        <router-link to="/create" tag="button" v-if="hasWallet" class="btn btn-lg btn-primary btn-block" replace>{{ $t('create_cta') }}</router-link>     
        </div>
        <b-modal id="error" centered ref="errorModal"  hide-footer title="Error">
        {{errorMsg}}
        </b-modal>
        <p class="mt-2 mb-2 small">&copy; 2018 BitShares</p>
    </div>
</template>
<script>
import { mapGetters } from 'vuex'

export default {
  name: "start",
  data() {
    return {
      walletpass: "",
      selectedWallet: "0",
      passincorrect: "",
      errorMsg: ""
      
    };
  },
  mounted() {
     this.$store
        .dispatch("BeetStore/loadWallets", {
        })
  },
  computed: {    
    hasWallet() {
      return this.$store.state.BeetStore.hasWallet;     
    },
    walletlist() {
      return this.$store.state.BeetStore.walletlist;
    }
  },
  methods: {
    unlockWallet() {      
      this.$store
        .dispatch("BeetStore/getWallet", {
          wallet_id: this.$data.selectedWallet,
          wallet_pass: this.$data.walletpass
        })
        .then(response => {
          this.$router.replace("/dashboard");
        })
        .catch(response => {
          this.$data.passincorrect = "is-invalid";
          this.$data.errorMsg = "Invalid Password.";
          this.$refs.errorModal.show();
        });
    }
  }
};
</script>