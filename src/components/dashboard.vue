<template>
        <div class="bottom ">

            <div class="row mb-2">
                <div class="col-12 text-center account py-2">
                    {{this.$root.$data.wallet.accountName}} ({{this.$root.$data.wallet.accountID}})
                </div>
            </div>
            <Balances ref="balancetable"></Balances>
            <NodeSelect  @first-connect="getBalances" ref="apinode"></NodeSelect>
             
        <b-modal id="accountRequest" ref="accountReqModal" hide-footer title="Account Details Request">
            The page/app <strong>'{{this.incoming.origin}}'</strong> is requesting to access your account ID.<br/>
                    <br/>
                    Do you want to allow access?
                    <b-btn class="mt-3" variant="success" block @click="allowAccess">Allow</b-btn>
                    <b-btn class="mt-1" variant="danger" block @click="denyAccess">Deny</b-btn>
        </b-modal>
        <b-modal id="transactionRequest" ref="transactionReqModal" hide-footer title="Transaction Request">
            The page/app
                    <strong>'{{this.incoming.origin}}'</strong> has submitted the following transaction.
                    <br/>
                    <br/>
                    <pre class="text-left"><code>{{this.incoming.operation}}</code></pre>
                     Do you want to execute it?
                    <b-btn class="mt-3" variant="success" block @click="acceptTx">Sign &amp; Broadcast</b-btn>
                    <b-btn class="mt-1" variant="danger" block @click="rejectTx">Ignore</b-btn>
        </b-modal>
        </div>
        
</template>

<script>
import CompanionServer from "../lib/CompanionServer";
import NodeSelect from "./node-select";
import Balances from "./balances";
import {
  PrivateKey,
  TransactionHelper,
  Aes,
  TransactionBuilder
} from "bitsharesjs";

export default {
  name: "dashboard",
  data() {
    return {
      text: "",
      api: {},
      incoming: ""
    };
  },
  components: { NodeSelect, Balances },
  mounted() {
    CompanionServer.initialize(this);
    CompanionServer.open();
    console.log(this.$root.$data.wallet);
  },
  methods: {
    getBalances: function() {
      console.log("Called from first connect");
      this.$refs.balancetable.getBalances();
    },
    requestAccess: function(request) {
      this.incoming = request;
      this.$refs.accountReqModal.show();
      return new Promise((res, rej) => {
        this.incoming.accept = res;
        this.incoming.reject = rej;
      });
    },
    requestTx: function(request) {
      this.incoming = request;
      this.$refs.transactionReqModal.show();
      return new Promise((res, rej) => {
        this.incoming.accept = res;
        this.incoming.reject = rej;
      });
    },
    allowAccess: function() {
      this.$refs.accountReqModal.hide();
      this.incoming.accept({
        account: this.$root.$data.wallet.accountName,
        id: this.$root.$data.wallet.accountID
      });
    },
    denyAccess: function() {
      this.$refs.accountReqModal.hide();
      this.incoming.reject({});
    },
    acceptTx: async function() {
      let tr = new TransactionBuilder();
      this.$root.$data.api.init_promise.then(res => {
        tr.add_type_operation(this.incoming.operation.op_type, this.incoming.operation.op_data);

        tr.set_required_fees().then(async () => {
          let pKey = PrivateKey.fromWif(this.$root.$data.wallet.keys.active);
          tr.add_signer(pKey, pKey.toPublicKey().toPublicKeyString());
          console.log("serialized transaction:", tr.serialize());
          let id= await tr.broadcast();
          this.incoming.accept({id: id});          
        this.$refs.transactionReqModal.hide();
        });
      });
    },
    rejectTx: function() {
      this.$refs.transactionReqModal.hide();
      this.incoming.reject({});
    }
  }
};
</script>
