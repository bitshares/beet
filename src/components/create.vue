<template>
        <div class="bottom ">
        <div id="step1" v-if="step==1">
        <h4 class="h4 mt-3 font-weight-bold">Step 1</h4>        
        <p class="my-3 font-weight-bold">Set a friendly name for your new wallet:</p>
        <input type="text" id="inputWallet" class="form-control mb-3" v-bind:class="s1c" placeholder="Wallet Name" required="" v-model="walletname">
        <button class="btn btn-lg btn-primary btn-block" type="submit" v-on:click="step2">Next</button>
        </div>
        <div id="step2"  v-if="step==2">
        <h4 class="h4 mt-3 font-weight-bold">Step 2</h4>        
        <p class="mb-2 font-weight-bold">Account Name</p>
        <input type="text" id="inputAccount" class="form-control mb-3" placeholder="BTS Account Name" required="" v-model="accountname">
        <p class="my-3 font-weight-normal">Please enter the private keys for your account below:</p>
        <p class="mb-2 font-weight-bold">Active Authority</p>
        <input type="text" id="inputActive" class="form-control mb-3" placeholder="Active Private Key" required="" v-model="activepk">
        <p class="mb-2 font-weight-bold">Owner Authority</p>
        <input type="text" id="inputOwner" class="form-control mb-3" placeholder="Owner Private Key" required=""  v-model="ownerpk">
        <p class="mb-2 font-weight-bold">Memo Key</p>
        <input type="text" id="inputMemo" class="form-control mb-3" placeholder="Memo Private Key" required="" v-model="memopk">
        <button class="btn btn-lg btn-primary btn-block" type="submit" v-on:click="step3">Next</button>
        </div>
        <div id="step3"  v-if="step==3">
        <h4 class="h4 mt-3 font-weight-bold">Step 3</h4>   
        <p class="mb-2 font-weight-bold">Set a password for this wallet:</p>
        <input type="password" id="inputPass" class="form-control mb-3" placeholder="Password" required="" v-model="password">
        <p class="mb-2 font-weight-bold">Confirm password:</p>
        <input type="password" id="inputConfirmPass" class="form-control mb-3" placeholder="Confirm Password" required="" v-model="confirmpassword">
        <button class="btn btn-lg btn-primary btn-block" type="submit" v-on:click="verifyAndCreate">Next</button>
        </div>
        <p class="mt-5 mb-3">&copy; 2018 BitShares</p>
        </div>
</template>

<script>
import { PrivateKey, key } from "bitsharesjs";
import { Apis } from "bitsharesjs-ws";
import {v4 as uuid} from "uuid";
import SecureLS from 'secure-ls';

export default {
  name: "create",
  data() {
    return {
      walletname: "",
      accountname: "",
      activepk: "",
      ownerpk: "",
      memopk: "",
      password: "",
      confirmpassword: "",
      step:1,
      s1c:''

    };
  },
  methods: {
    step2: function() {
      if (this.$data.walletname.trim()=="") {
        this.$data.s1c='is-invalid';
      }else{
        let wallets=localStorage.getItem(wallets);
        // TODO: check if wallet exists
        this.$data.step=2;
      }
    },
    step3: function() {
      this.$data.step=3;
    },
    verifyAndCreate: async function() {
      console.log("Verifying");

      console.log(this.accountname);
      let apkey = PrivateKey.fromWif(this.activepk)
        .toPublicKey()
        .toString("BTS");
      let opkey = PrivateKey.fromWif(this.ownerpk)
        .toPublicKey()
        .toString("BTS");
      let mpkey = PrivateKey.fromWif(this.memopk)
        .toPublicKey()
        .toString("BTS");

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
              res[0][1].account.owner.key_auths[0][0] == opkey &&
              res[0][1].account.options.memo_key == mpkey
            ) {
              return res[0][1].account.id;
            } else {
              return null;
            }
          });
      });
      
      if (verified!==null) {        
          let wallets=localStorage.getItem("wallets");          
          let walletid=uuid();          
          let newwallet= { id: walletid, name: this.$data.walletname };
          console.log(wallets);
          if (!wallets) {
            console.log(wallets);
            wallets=[];
            
          }else{
            wallets=JSON.parse(wallets);
          }
          wallets.push(newwallet);          
          localStorage.setItem("wallets",JSON.stringify(wallets));          
          let ls = new SecureLS({encodingType: 'aes', isCompression: true, encryptionSecret: this.$data.password});
          let walletdata={ accountName: this.$data.accountname, accountID: verified, keys: {active: this.activepk, owner: this.ownerpk, memo: this.memopk}};
          ls.set(walletid,walletdata);   
          this.$root.$data.wallet=walletdata;       
          this.$router.replace('/dashboard');
      }
    } 
  }
};
</script>