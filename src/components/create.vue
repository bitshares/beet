<template>
        <div class="bottom ">
        <h4 class="h4 font-weight-bold">Step 1</h4>
        <p class="mb-2 font-weight-bold">Account Name</p>
        <input type="text" id="inputAccount" class="form-control mb-3" placeholder="BTS Account Name" required="" v-model="accountname">
        <p class="my-3 font-weight-normal">Please enter the private keys for your account below:</p>
        <p class="mb-2 font-weight-bold">Active Authority</p>
        <input type="text" id="inputActive" class="form-control mb-3" placeholder="Active Private Key" required="" v-model="activepk">
        <p class="mb-2 font-weight-bold">Owner Authority</p>
        <input type="text" id="inputOwner" class="form-control mb-3" placeholder="Owner Private Key" required=""  v-model="ownerpk">
        <p class="mb-2 font-weight-bold">Memo Key</p>
        <input type="text" id="inputMemo" class="form-control mb-3" placeholder="Memo Private Key" required="" v-model="memopk">
        <button class="btn btn-lg btn-primary btn-block" type="submit" v-on:click="verifyAndCreate">Next</button>
        <p class="mt-5 mb-3">&copy; 2017-2018</p>
        </div>
</template>

<script>
import { PrivateKey, key } from "bitsharesjs";
import { Apis } from "bitsharesjs-ws";

export default {
  name: "create",
  data() {
    return {
      accountname: "",
      activepk: "",
      ownerpk: "",
      memopk: ""
    };
  },
  methods: {
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
      console.log(verified);
      if (verified!==null) {
          localStorage.setItem("accountName",this.accountname);
          localStorage.setItem("accountID",verified);
          localStorage.setItem("wallet",{active: this.activepk, owner: this.ownerpk, memo: this.memopk});

      }
    }
  }
};
</script>