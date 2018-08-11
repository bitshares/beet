<template>
     <div class="main">
        <div class="top">
            <div class="row">
                <div class="col-12 d-flex">
                    <img class="" src="img/bitshares.png" alt="" width="56" height="56">
                    <h4 class="h4 font-weight-normal align-self-center">BitShares Companion</h4>
                </div>
            </div>
        </div>
        <div class="bottom ">

            <div class="row mb-2">
                <div class="col-12 text-center account py-2">
                    clockwork (1.2.12345)
                </div>
            </div>
            <Balances ref="balancetable"></Balances>
            <NodeSelect  @first-connect="getBalances"></NodeSelect>
                
        </div>
        
        <b-modal id="accountRequest" ref="accountReqModal" title="Account Details Request">
            The page/app <strong>'BitShares Companion-enabled app'</strong> is requesting to access your account ID.<br/>
                    <br/>
                    Do you want to allow access?
        </b-modal>
    </div>
</template>

<script>
import CompanionServer from "./lib/CompanionServer";
import NodeSelect from "./node-select";
import Balances from "./balances";

export default {
  name: "dashboard",
  data() {
    return {
      text: "",
      api: {}
    };
  },
  components: { NodeSelect, Balances },
  mounted() {
    CompanionServer.initialize(this);
    CompanionServer.open();
  },
  methods: {
    getBalances: function() {
      console.log("Called from first connect");
      this.$refs.balancetable.getBalances();
    }
  }
};
</script>
