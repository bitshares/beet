<template>
    <div>
        <b-modal
            id="linkRequest"
            ref="linkReqModal"
            centered
            no-close-on-esc
            no-close-on-backdrop
            hide-header-close
            hide-footer
            :title="$t('link_request')"
        >
            {{ this.genericmsg }}:
            <br>
            <br>        
        </b-modal>
        
        <b-modal
            id="accountRequest"
            ref="accountReqModal"
            centered
            no-close-on-esc
            no-close-on-backdrop
            hide-header-close
            hide-footer
            :title="$t('operations:account_id.title')"
        >
            {{ $t('operations:account_id.request',{origin: this.incoming.origin }) }}
            <br>
            <br>
            {{ $t('operations:account_id.request_cta') }}
            <b-btn
                class="mt-3"
                variant="success"
                block
                @click="allowAccess"
            >{{ $t('operations:account_id.accept_btn') }}</b-btn>
            <b-btn
                class="mt-1"
                variant="danger"
                block
                @click="denyAccess"
            >{{ $t('operations:account_id.reject_btn') }}</b-btn>
        </b-modal>
        <b-modal
            id="transactionRequest"
            ref="transactionReqModal"
            centered
            no-close-on-esc
            no-close-on-backdrop
            hide-header-close
            hide-footer
            :title="$t('operations:rawsig.title')"
        >
            {{ $t('operations:rawsig.request',{origin: this.incoming.origin }) }}
            <br>
            <br>
            <pre class="text-left custom-content"><code>
{
  op_type: {{ this.incoming.op_type }},
  op_data: {{ this.incoming.op_data }}
}
            </code></pre>
            
            {{ $t('operations:rawsig.request_cta') }}
            <b-btn
                class="mt-3"
                variant="success"
                block
                @click="acceptTx"
            >
                {{ $t('operations:rawsig.accept_btn') }}</b-btn>
            <b-btn
                class="mt-1"
                variant="danger"
                block
                @click="rejectTx"
            >
                {{ $t('operations:rawsig.reject_btn') }}</b-btn>
        </b-modal>
        <b-modal
            id="genericRequest"
            ref="genericReqModal"
            centered
            no-close-on-esc
            no-close-on-backdrop
            hide-header-close
            hide-footer
            :title="this.generictitle "
        >
            {{ this.genericmsg }}:
            <br>
            <br>
            <pre class="text-left custom-content"><code>
{{ this.specifics }}
            </code></pre>
            <b-btn
                class="mt-3"
                variant="success"
                block
                @click="acceptGeneric"
            >{{ this.genericaccept }}</b-btn>
            <b-btn
                class="mt-1"
                variant="danger"
                block
                @click="rejectGeneric"
            >{{ this.genericreject }}</b-btn>
        </b-modal>
        <b-modal
            id="loaderAnim"
            ref="loaderAnimModal"
            centered
            no-close-on-esc
            no-close-on-backdrop
            hide-header
            hide-header-close
            hide-footer
        >
            <div class="lds-roller"><div /><div /><div /><div /><div /><div /><div /><div /></div>
        </b-modal>
        <div class="alerts">
            <b-alert variant="info" v-bind:key="alert.id" v-for="alert in alerts" show fade dismissible v-on:dismissed="hideAlert(alert.id)">{{alert.msg}}</b-alert>            
        </div>
    </div>
</template>
<style>
    .alerts {
        position:absolute;
        left:5%;
        right:5%;
        top:3rem;
        width:90%;
    }
</style>
<script>
import {
    v4 as uuidv4
} from "uuid";
import { EventBus } from '../lib/event-bus.js';
import Operations from "../lib/Operations";
import { Apis } from "bitsharesjs-ws";
    import {
        PrivateKey,
        TransactionBuilder
    } from "bitsharesjs";

    export default {
        name: "Popups",
        i18nOptions: { namespaces: ["common", "operations"] },
        data() {
            return {
                genericmsg: '',
                alerts: [],
                api: null,
                incoming: {},                
                specifics: ""
            };
        },  
        created() {
            EventBus.$on('popup', what => {
                switch(what) {
                    case 'load-start':
                        this.$refs.loaderAnimModal.show();
                        break;
                    case 'load-end':
                        this.$refs.loaderAnimModal.hide();
                        break;
                }
            });
        },
        watch:{
            $route (to, from){
                this.alerts = [];
            }
        },      
        methods: {
            link: async function() {
                await this.$refs.linkReqModal.show();
            },
            showAlert: function(request) { 
                let alert;
                let alertmsg; 
                switch(request.type) {
                    case 'link':
                        alertmsg=this.$t('link_alert',request);
                        alert={msg:alertmsg, id: uuidv4()};
                        
                        this.$store.dispatch("WalletStore/notifyUser", {
                            notify: "request", message: alertmsg
                        });                        
                        break;
                    default:
                        alertmsg=this.$t('access_alert',request.payload);
                        
                        this.$store.dispatch("WalletStore/notifyUser", {
                            notify: "request", message: alertmsg
                        });                        
                        alert={msg:alertmsg, id: uuidv4()};
                        break;
                }
                //let alert={msg:msg, id: uuidv4()};
                this.alerts.push(alert);
            },
            hideAlert: function(id) {
                let index = this.alerts.findIndex(function(o){
                    return o.id === id;
                })
                if (index !== -1) this.alerts.splice(index, 1);
            },
            requestAccess: function(request) {
                
                this.$store.dispatch("WalletStore/notifyUser", {
                    notify: "request", message: "request"
                });
                this.incoming = {};
                this.incoming = request;
                this.$refs.accountReqModal.show();
                return new Promise((res, rej) => {
                    this.incoming.accept = res;
                    this.incoming.reject = rej;
                });
            },
            requestVote: async function(request) {
                this.$store.dispatch("WalletStore/notifyUser", {
                    notify: "request", message: "request"
                });
                this.incoming = {};
                this.incoming = request;

                this.incoming.action = "vote";
                let entity_id = this.incoming.params.id.split(".");
                if (entity_id[0] != "1") {
                    return Promise.reject();
                }
                if (entity_id[1] != "5" && entity_id[1] != "6" && entity_id[1] != "14") {
                    return Promise.reject();
                }

                let entity = "";
                let objdata = await Apis.instance()
                    .db_api()
                    .exec("get_objects", [[this.incoming.params.id]]);

                let objextradata;
                switch (entity_id[1]) {
                case "5":
                    entity = "committee member";
                    objextradata = await Apis.instance()
                        .db_api()
                        .exec("get_objects", [[objdata[0].committee_member_account]]);
                    this.specifics =
                        "Commitee member: " +
                        objextradata[0].name +
                        "\nCommittee Member ID: " +
                        this.incoming.params.id;
                    this.incoming.vote_id = objdata[0].vote_id;
                    break;
                case "6":
                    entity = "witness";
                    objextradata = await Apis.instance()
                        .db_api()
                        .exec("get_objects", [[objdata[0].witness_account]]);
                    this.specifics =
                        "Witness: " +
                        objextradata[0].name +
                        "\nWitness ID: " +
                        this.incoming.params.id;
                    this.incoming.vote_id = objdata[0].vote_id;
                    break;
                case "14":
                    entity = "worker proposal";
                    objextradata = await Apis.instance()
                        .db_api()
                        .exec("get_objects", [[objdata[0].worker_account]]);
                    this.specifics =
                        "Proposal: " +
                        objdata[0].name +
                        "\nProposal ID: " +
                        this.incoming.params.id +
                        "\nDaily Pay: " +
                        this.formatMoney(objdata[0].daily_pay / Math.pow(10, 5), 5) +
                        "BTS\nWorker: " +
                        objextradata[0].name;
                    this.incoming.vote_id = objdata[0].vote_for;
                    break;
                }
                this.genericmsg = this.$t('operations:vote.request', {origin: this.incoming.origin, entity: entity });
                this.generictitle=this.$t('operations:vote.title');
                this.genericaccept=this.$t('operations:vote.accept_btn');
                this.genericreject=this.$t('operations:vote.reject_btn');
                this.$refs.genericReqModal.show();
                return new Promise((res, rej) => {
                    this.incoming.acceptgen = res;
                    this.incoming.rejectgen = rej;
                });
            },
            requestTx: function(request) {
                this.$store.dispatch("WalletStore/notifyUser", {
                    notify: "request", message: "request"
                });
                this.incoming = {};
                this.incoming = request;
                this.$refs.transactionReqModal.show();
                return new Promise((res, rej) => {
                    this.incoming.accepttx = res;
                    this.incoming.rejecttx = rej;
                });
            },
            allowAccess: function() {
                this.$refs.accountReqModal.hide();
                this.incoming.accept({
                    account: this.$store.state.WalletStore.wallet.accountName,
                    id: this.$store.state.WalletStore.wallet.accountID
                });
            },
            denyAccess: function() {
                this.$refs.accountReqModal.hide();
                this.incoming.reject({});
            },
            acceptTx: async function() {
                let tr = new TransactionBuilder();
                Apis.instance().init_promise.then(() => {
                    tr.add_type_operation(
                        this.incoming.params.op_type,
                        this.incoming.params.op_data
                    );
                    tr.set_required_fees().then(async () => {
                        this.$refs.loaderAnimModal.show();
                        let pKey = PrivateKey.fromWif(
                            this.$store.state.WalletStore.wallet.keys.active
                        );
                        tr.add_signer(pKey, pKey.toPublicKey().toPublicKeyString());
                        let id = await tr.broadcast();
                        this.incoming.accepttx({ id: id });
                        this.$refs.transactionReqModal.hide();
                        this.$refs.loaderAnimModal.hide();
                    });
                });
            },
            rejectTx: function() {
                this.$refs.transactionReqModal.hide();
                this.incoming.rejecttx({});
            },
            acceptGeneric: async function() {
                let tr = new TransactionBuilder();
                let operation = await Operations.generate(
                    this.incoming,
                    this.$store.state.WalletStore.wallet.accountID
                );

                tr.add_type_operation(operation.op_type, operation.op_data);
                tr.set_required_fees().then(async () => {
                    this.$refs.loaderAnimModal.show();
                    let pKey = PrivateKey.fromWif(
                        this.$store.state.WalletStore.wallet.keys.active
                    );
                    tr.add_signer(pKey, pKey.toPublicKey().toPublicKeyString());
                    let resp = await tr.broadcast();
                    this.incoming.acceptgen(resp);
                    this.$refs.genericReqModal.hide();
                    this.$refs.loaderAnimModal.hide();
                });
            },
            rejectGeneric: function() {
                this.$refs.genericReqModal.hide();
                this.incoming.rejectgen({});
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