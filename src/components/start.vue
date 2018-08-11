<template>
    <div class="bottom">
        <p class="mb-3 font-weight-normal" v-if="!hasWallet"><em>There is no wallet stored in this computer.</em></p>
        <router-link to="/create" tag="button" v-if="!hasWallet" class="btn btn-lg btn-primary btn-block" replace>Get Started</router-link>
        <p class="mb-1 mt-3 font-weight-normal"  v-if="hasWallet">Account:</p>
        <p class="mb-3 font-weight-normal"  v-if="hasWallet"><strong>{{accountName}}</strong> (<span>{{accountID}}</span>)</p>
        <input type="password" id="inputPassword" class="form-control mb-3" placeholder="Password" required=""  v-if="hasWallet">
        <button class="btn btn-lg btn-primary btn-block" type="submit" v-if="hasWallet">Unlock</button>
        <p class="mt-5 mb-3">&copy; 2017-2018</p>
    </div>
</template>
<script>
export default {
  name: "start",
  data() {
    return {
      hasWallet: false
    };
  },
  mounted() {
    if (localStorage.getItem("wallet")) {
      this.hasWallet = true;
      this.accountName = localStorage.getItem("accountName");
      this.accountID = localStorage.getItem("accountID");
    }
  }
};
</script>