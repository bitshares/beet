<template>
    <div class="bottom ">
        <div class="content">
            <div class="row mb-2">
                <div class="col-12 text-center account py-2">
                    {{ accountName }} ({{ accountID }})
                </div>
            </div>
            <Balances ref="balancetable" />
        </div>
        <NodeSelect
            ref="apinode"
            @first-connect="getBalances"
        />
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
            {{ $t('operations:account_id.request',{origin: this.$data.incoming.origin }) }}
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
            {{ $t('operations:rawsig.request',{origin: this.$data.incoming.origin }) }}
            <br>
            <br>
            <pre class="text-left custom-content"><code>
{
  op_type: {{ this.$data.incoming.op_type }},
  op_data: {{ this.$data.incoming.op_data }}
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
            :title="this.$data.generictitle "
        >
            {{ this.$data.genericmsg }}:
            <br>
            <br>
            <pre class="text-left custom-content"><code>
{{ this.$data.specifics }}
            </code></pre>
            <b-btn
                class="mt-3"
                variant="success"
                block
                @click="acceptGeneric"
            >{{ this.$data.genericaccept }}</b-btn>
            <b-btn
                class="mt-1"
                variant="danger"
                block
                @click="rejectGeneric"
            >{{ this.$data.genericreject }}</b-btn>
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
    </div>

</template>

<script>
    import Operations from "../lib/Operations";
    import NodeSelect from "./node-select";
    import Balances from "./balances";
    import { Apis } from "bitsharesjs-ws";
    import {
        PrivateKey,
        TransactionBuilder
    } from "bitsharesjs";

    export default {
        name: "Dashboard",
        i18nOptions: { namespaces: ["common", "operations"] },
        components: { NodeSelect, Balances },
        data() {
            return {
                text: "",
                api: {},
                incoming: "",
                genericmsg: "",
                specifics: ""
            };
        },
        computed: {
            accountName() {
                return this.$store.state.WalletStore.wallet.accountName;
            },
            accountID() {
                return this.$store.state.WalletStore.wallet.accountID;
            }
        },
        mounted() {
            this.$refs.loaderAnimModal.show();
        },
        methods: {
            getBalances: async function() {
                await this.$refs.balancetable.getBalances();
                this.$store.dispatch("WalletStore/confirmUnlock");
                this.$refs.loaderAnimModal.hide();
            },
            requestAccess: function(request) {
                
                this.$store.dispatch("WalletStore/notifyUser", {
                    notify: "request"
                });
                this.$data.incoming = {};
                this.$data.incoming = request;
                this.$refs.accountReqModal.show();
                return new Promise((res, rej) => {
                    this.$data.incoming.accept = res;
                    this.$data.incoming.reject = rej;
                });
            },
            requestVote: async function(request) {
                this.$store.dispatch("WalletStore/notifyUser", {
                    notify: "request"
                });
                this.$data.incoming = {};
                this.$data.incoming = request;

                this.$data.incoming.action = "vote";
                let entity_id = this.$data.incoming.params.id.split(".");
                if (entity_id[0] != "1") {
                    return Promise.reject();
                }
                if (entity_id[1] != "5" && entity_id[1] != "6" && entity_id[1] != "14") {
                    return Promise.reject();
                }

                let entity = "";
                let objdata = await Apis.instance()
                    .db_api()
                    .exec("get_objects", [[this.$data.incoming.params.id]]);

                let objextradata;
                switch (entity_id[1]) {
                case "5":
                    entity = "committee member";
                    objextradata = await Apis.instance()
                        .db_api()
                        .exec("get_objects", [[objdata[0].committee_member_account]]);
                    this.$data.specifics =
                        "Commitee member: " +
                        objextradata[0].name +
                        "\nCommittee Member ID: " +
                        this.$data.incoming.params.id;
                    this.$data.incoming.vote_id = objdata[0].vote_id;
                    break;
                case "6":
                    entity = "witness";
                    objextradata = await Apis.instance()
                        .db_api()
                        .exec("get_objects", [[objdata[0].witness_account]]);
                    this.$data.specifics =
                        "Witness: " +
                        objextradata[0].name +
                        "\nWitness ID: " +
                        this.$data.incoming.params.id;
                    this.$data.incoming.vote_id = objdata[0].vote_id;
                    break;
                case "14":
                    entity = "worker proposal";
                    objextradata = await Apis.instance()
                        .db_api()
                        .exec("get_objects", [[objdata[0].worker_account]]);
                    this.$data.specifics =
                        "Proposal: " +
                        objdata[0].name +
                        "\nProposal ID: " +
                        this.$data.incoming.params.id +
                        "\nDaily Pay: " +
                        this.formatMoney(objdata[0].daily_pay / Math.pow(10, 5), 5) +
                        "BTS\nWorker: " +
                        objextradata[0].name;
                    this.$data.incoming.vote_id = objdata[0].vote_for;
                    break;
                }
                this.$data.genericmsg = this.$t('operations:vote.request', {origin: this.$data.incoming.origin, entity: entity });
                this.$data.generictitle=this.$t('operations:vote.title');
                this.$data.genericaccept=this.$t('operations:vote.accept_btn');
                this.$data.genericreject=this.$t('operations:vote.reject_btn');
                this.$refs.genericReqModal.show();
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
                    account: this.$store.state.WalletStore.wallet.accountName,
                    id: this.$store.state.WalletStore.wallet.accountID
                });
            },
            denyAccess: function() {
                this.$refs.accountReqModal.hide();
                this.$data.incoming.reject({});
            },
            acceptTx: async function() {
                let tr = new TransactionBuilder();
                Apis.instance().init_promise.then(() => {
                    tr.add_type_operation(
                        this.$data.incoming.params.op_type,
                        this.$data.incoming.params.op_data
                    );
                    tr.set_required_fees().then(async () => {
                        this.$refs.loaderAnimModal.show();
                        let pKey = PrivateKey.fromWif(
                            this.$store.state.WalletStore.wallet.keys.active
                        );
                        tr.add_signer(pKey, pKey.toPublicKey().toPublicKeyString());
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
                let operation = await Operations.generate(
                    this.$data.incoming,
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
                    this.$data.incoming.acceptgen(resp);
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
