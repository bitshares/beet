<template>
<div class="balances mt-3">
                <p class="mb-1 font-weight-bold small">Balances</p>
                <table class="table small table-striped table-sm">
                    <tbody>                    
                        <tr v-for="balance in balances" :key="balance.id">
                            <td>{{balance.asset_type}}</td>
                            <td>{{balance.balance}}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
    </template>
    
<script>

import { Apis } from "bitsharesjs-ws";
export default {
  name: "Balances",
  data() {
    return {
        balances:[]
    };
  },
  methods: {
    getBalances: function() {

         Apis.instance().db_api().exec("get_full_accounts", [['1.2.711128'], false]).then(res => {
             console.log(res);
             console.log(this);
             this.balances=res[0][1].balances;
         });
    }  
  },
  mounted() {
     
  }
};
</script>
