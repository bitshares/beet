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
             
        <b-modal id="accountRequest" centered ref="accountReqModal" no-close-on-esc no-close-on-backdrop hide-header-close hide-footer title="Account Details Request" >
            The page/app <strong>'{{this.$data.incoming.origin}}'</strong> is requesting to access your account ID.<br/>
                    <br/>
                    Do you want to allow access?
                    <b-btn class="mt-3" variant="success" block @click="allowAccess">Allow</b-btn>
                    <b-btn class="mt-1" variant="danger" block @click="denyAccess">Deny</b-btn>
        </b-modal>
        <b-modal id="transactionRequest" centered ref="transactionReqModal" no-close-on-esc no-close-on-backdrop hide-header-close hide-footer title="Transaction Request" >
            The page/app
                    <strong>'{{this.$data.incoming.origin}}'</strong> has submitted the following transaction.
                    <br/>
                    <br/>
                    <pre class="text-left custom-content"><code>
{ 
  op_type: {{this.$data.incoming.op_type}},
  op_data: {{this.$data.incoming.op_data}}
}
                      </code></pre>
                     Do you want to execute it?
                    <b-btn class="mt-3" variant="success" block @click="acceptTx">Sign &amp; Broadcast</b-btn>
                    <b-btn class="mt-1" variant="danger" block @click="rejectTx">Ignore</b-btn>
        </b-modal>
        <b-modal id="genericRequest" centered ref="genericReqModal" no-close-on-esc no-close-on-backdrop hide-header-close hide-footer title="Incoming Request">
            The page/app
                    <strong>'{{this.$data.incoming.origin}}'</strong> {{this.$data.genericmsg}}:
                    <br/>
                    <br/>
                      <pre class="text-left custom-content"><code>
{{this.$data.specifics}}
                      </code></pre>
                    
                    
                    <b-btn class="mt-3" variant="success" block @click="acceptGeneric">Approve</b-btn>
                    <b-btn class="mt-1" variant="danger" block @click="rejectGeneric">Ignore</b-btn>
        </b-modal>
        <b-modal id="loaderAnim" centered ref="loaderAnimModal" no-close-on-esc no-close-on-backdrop hide-header hide-header-close hide-footer title="Loading...">
        <div class="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
        </b-modal>
        </div>
        
</template>

<script>
import CompanionServer from "../lib/CompanionServer";
import Operations from "../lib/Operations";
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
      incoming: "",
      genericmsg: "",
      specifics: ""
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
      this.$root.$data.ipc.send("notify", "request");
      this.$data.incoming = {};
      this.$data.incoming = request;
      this.$refs.accountReqModal.show();
      return new Promise((res, rej) => {
        this.$data.incoming.accept = res;
        this.$data.incoming.reject = rej;
      });
    },
    requestVote: async function(request) {
      this.$root.$data.ipc.send("notify", "request");
      this.$data.incoming = {};
      this.$data.incoming = request;

      this.$data.incoming.action = "vote";
      let entity_id = this.$data.incoming.id.split(".");
      if (entity_id[0] != "1") {
        return Promise.reject();
      }
      if (entity_id[1] != "5" && entity_id[1] != "6" && entity_id[1] != "14") {
        return Promise.reject();
      }

      let entity = "";
      let objdata = await this.$root.$data.api
        .db_api()
        .exec("get_objects", [[this.$data.incoming.id]]);

      let objextradata;
      switch (entity_id[1]) {
        case "5":
          entity = "committee member";
          objextradata = await this.$root.$data.api
            .db_api()
            .exec("get_objects", [[objdata[0].committee_member_account]]);
          this.$data.specifics =
            "Commitee member: " +
            objextradata[0].name +
            "\nCommittee Member ID: " +
            this.$data.incoming.id;
          this.$data.incoming.vote_id = objdata[0].vote_id;
          break;
        case "6":
          entity = "witness";
          objextradata = await this.$root.$data.api
            .db_api()
            .exec("get_objects", [[objdata[0].witness_account]]);
          this.$data.specifics =
            "Witness: " +
            objextradata[0].name +
            "\nWitness ID: " +
            this.$data.incoming.id;
          this.$data.incoming.vote_id = objdata[0].vote_id;
          break;
        case "14":
          entity = "worker proposal";
          objextradata = await this.$root.$data.api
            .db_api()
            .exec("get_objects", [[objdata[0].worker_account]]);
          this.$data.specifics =
            "Proposal: " +
            objdata[0].name +
            "\nProposal ID: " +
            this.$data.incoming.id +
            "\nDaily Pay: " +
            this.formatMoney(objdata[0].daily_pay / Math.pow(10, 5), 5) +
            "BTS\nWorker: " +
            objextradata[0].name;
          this.$data.incoming.vote_id = objdata[0].vote_for;
          break;
      }
      console.log(objextradata);
      this.$data.genericmsg = "wants you to vote for the following " + entity;
      console.log("pre-show");
      this.$refs.genericReqModal.show();
      console.log("shown");
      return new Promise((res, rej) => {
        this.$data.incoming.acceptgen = res;
        this.$data.incoming.rejectgen = rej;
      });
    },
    requestTx: function(request) {
      this.$root.$data.ipc.send("notify", "request");
      this.$data.incoming = {};
      this.$data.incoming = request;
      this.$refs.transactionReqModal.show();
      return new Promise((res, rej) => {
        this.$data.incoming.accepttx = res;
        this.$data.incoming.rejecttx = rej;
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
          this.$data.incoming.accepttx({ id: id });
          this.$refs.transactionReqModal.hide();
          this.$refs.loaderAnimModal.hide();
        });
      });
    },
    rejectTx: function() {
      this.$refs.transactionReqModal.hide();
      this.$data.incoming.rejecttx({});
    },
    acceptGeneric: async function() {
      let tr = new TransactionBuilder();
      let res = await this.$root.$data.api.init_promise;
      let operation = await Operations.generate(
        this.$data.incoming,
        this.$root.$data.api,
        this.$root.$data.wallet.accountID
      );
      console.log(operation);
      tr.add_type_operation(operation.op_type, operation.op_data);
      tr.set_required_fees().then(async () => {
        this.$refs.loaderAnimModal.show();
        let pKey = PrivateKey.fromWif(this.$root.$data.wallet.keys.active);
        tr.add_signer(pKey, pKey.toPublicKey().toPublicKeyString());
        console.log("serialized transaction:", tr.serialize());
        let id = await tr.broadcast();
        this.$data.incoming.acceptgen({ id: id });
        this.$refs.genericReqModal.hide();
        this.$refs.loaderAnimModal.hide();
      });
    },
    rejectGeneric: function() {
      this.$refs.genericReqModal.hide();
      this.$data.incoming.rejectgen({});
    },
    formatMoney: function(n, decimals, decimal_sep, thousands_sep) {
      var c = isNaN(decimals) ? 2 : Math.abs(decimals),
        d = decimal_sep || ".",
        t = typeof thousands_sep === "undefined" ? "," : thousands_sep,
        sign = n < 0 ? "-" : "",
        i = parseInt((n = Math.abs(n).toFixed(c))) + "",
        j = (j = i.length) > 3 ? j % 3 : 0;
      return (
        sign +
        (j ? i.substr(0, j) + t : "") +
        i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) +
        (c
          ? d +
            Math.abs(n - i)
              .toFixed(c)
              .slice(2)
          : "")
      );
    }
  }
};
</script>
