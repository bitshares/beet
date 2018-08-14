<template>
        <div class="bottom ">
<div class="content">
            <div class="row mb-2">
                <div class="col-12 text-center account py-2">
                    {{this.$root.$data.wallet.accountName}} ({{this.$root.$data.wallet.accountID}})
                </div>
            </div>
            <Balances ref="balancetable"></Balances>
            </div>
            <NodeSelect  @first-connect="getBalances" ref="apinode"></NodeSelect>
             
        <b-modal id="accountRequest" centered ref="accountReqModal" no-close-on-esc no-close-on-backdrop hide-header-close hide-footer title="Account Details Request" @hidden="denyAccess">
            The page/app <strong>'{{this.$data.incoming.origin}}'</strong> is requesting to access your account ID.<br/>
                    <br/>
                    Do you want to allow access?
                    <b-btn class="mt-3" variant="success" block @click="allowAccess">Allow</b-btn>
                    <b-btn class="mt-1" variant="danger" block @click="denyAccess">Deny</b-btn>
        </b-modal>
        <b-modal id="transactionRequest" centered ref="transactionReqModal" no-close-on-esc no-close-on-backdrop hide-header-close hide-footer title="Transaction Request" @hidden="rejectTx">
            The page/app
                    <strong>'{{this.$data.incoming.origin}}'</strong> has submitted the following transaction.
                    <br/>
                    <br/>
                    <pre class="text-left"><code>{ 
                      op_type: {{this.$data.incoming.op_type}},
                      op_data: {{this.$data.incoming.op_data}}
                      </code></pre>
                     Do you want to execute it?
                    <b-btn class="mt-3" variant="success" block @click="acceptTx">Sign &amp; Broadcast</b-btn>
                    <b-btn class="mt-1" variant="danger" block @click="rejectTx">Ignore</b-btn>
        </b-modal>
        <b-modal id="loaderAnim" centered ref="loaderAnimModal" no-close-on-esc no-close-on-backdrop hide-header hide-header-close hide-footer title="Loading...">
        <div class="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
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
    this.$refs.loaderAnimModal.show();
    CompanionServer.initialize(this);
    CompanionServer.open();
    console.log(this.$root.$data.wallet);
  },
  methods: {
    getBalances: async function() {
      console.log("Called from first connect");
      
      await this.$refs.balancetable.getBalances();
      this.$refs.loaderAnimModal.hide();
    },
    requestAccess: function(request) {
      this.$data.incoming = request;
      this.$refs.accountReqModal.show();
      return new Promise((res, rej) => {
        this.$data.incoming.accept = res;
        this.$data.incoming.reject = rej;
      });
    },
    requestTx: function(request) {
      this.$data.incoming = request;
      this.$refs.transactionReqModal.show();
      return new Promise((res, rej) => {
        this.$data.incoming.accept = res;
        this.$data.incoming.reject = rej;
      });
    },
    allowAccess: function() {
      this.$refs.accountReqModal.hide();
      this.$data.incoming.accept({
        account: this.$root.$data.wallet.accountName,
        id: this.$root.$data.wallet.accountID
      });
    },
    denyAccess: function() {
      this.$refs.accountReqModal.hide();
      this.$data.incoming.reject({});
    },
    acceptTx: async function() {
      let tr = new TransactionBuilder();
      this.$root.$data.api.init_promise.then(res => {
        tr.add_type_operation(
          this.$data.incoming.op_type,
          this.$data.incoming.op_data
        );

        tr.set_required_fees().then(async () => {
          this.$refs.loaderAnimModal.show();
          let pKey = PrivateKey.fromWif(this.$root.$data.wallet.keys.active);
          tr.add_signer(pKey, pKey.toPublicKey().toPublicKeyString());
          console.log("serialized transaction:", tr.serialize());
          let id = await tr.broadcast();
          this.$data.incoming.accept({ id: id });
          this.$refs.transactionReqModal.hide();
          this.$refs.loaderAnimModal.hide();
        });
      });
    },
    rejectTx: function() {
      this.$refs.transactionReqModal.hide();
      this.$data.incoming.reject({});
    }
  }
};
</script>
