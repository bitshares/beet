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
            {{ genericmsg }}:
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
            {{ $t('operations:account_id.request',{origin: incoming.origin }) }}
            <br>
            <br>
            {{ $t('operations:account_id.request_cta') }}
            <b-btn
                class="mt-3"
                variant="success"
                block
                @click="allowAccess"
            >
                {{ $t('operations:account_id.accept_btn') }}
            </b-btn>
            <b-btn
                class="mt-1"
                variant="danger"
                block
                @click="denyAccess"
            >
                {{ $t('operations:account_id.reject_btn') }}
            </b-btn>
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
            {{ $t('operations:rawsig.request',{origin: incoming.origin }) }}
            <br>
            <br>
            <pre class="text-left custom-content">
                <code>
    {
    op_type: {{ incoming.op_type }},
    op_data: {{ incoming.op_data }}
    }
                </code>
            </pre>
            {{ $t('operations:rawsig.request_cta') }}
            <b-btn
                class="mt-3"
                variant="success"
                block
                @click="acceptTx"
            >
                {{ $t('operations:rawsig.accept_btn') }}
            </b-btn>
            <b-btn
                class="mt-1"
                variant="danger"
                block
                @click="rejectTx"
            >
                {{ $t('operations:rawsig.reject_btn') }}
            </b-btn>
        </b-modal>
        <b-modal
            id="genericRequest"
            ref="genericReqModal"
            centered
            no-close-on-esc
            no-close-on-backdrop
            hide-header-close
            hide-footer
            :title="generictitle "
        >
            {{ genericmsg }}:
            <br>
            <br>
            <pre class="text-left custom-content">
                <code>
    {{ specifics }}
                </code>
            </pre>
            <b-btn
                class="mt-3"
                variant="success"
                block
                @click="acceptGeneric"
            >
                {{ genericaccept }}
            </b-btn>
            <b-btn
                class="mt-1"
                variant="danger"
                block
                @click="rejectGeneric"
            >
                {{ genericreject }}
            </b-btn>
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
            <div class="lds-roller">
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
            </div>
        </b-modal>
        <div class="alerts">
            <b-alert
                v-for="alert in alerts"
                :key="alert.id"
                variant="info"
                show
                fade
                dismissible
                @dismissed="hideAlert(alert.id)"
            >
                {{ alert.msg }}
            </b-alert>
        </div>
    </div>
</template>
<script>
    import {
        v4 as uuidv4
    } from "uuid";
    import {EventBus} from '../lib/event-bus.js';
    import Operations from "../lib/Operations";

    import getBlockchain from "../lib/blockchains/blockchainFactory"

    export default {
        name: "Popups",
        i18nOptions: {namespaces: ["common", "operations"]},
        data() {
            return {
                genericmsg: '',
                alerts: [],
                api: null,
                incoming: {},
                specifics: "",
                blockchain: getBlockchain(this.$store.state.WalletStore.wallet.chain)
            };
        },
        watch: {
            $route(to, from) {
                this.alerts = [];
            }
        },
        created() {
            EventBus.$on('popup', what => {
                switch (what) {
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
            link: async function () {
                await this.$refs.linkReqModal.show();
            },
            showAlert: function (request) {
                let alert;
                let alertmsg;
                switch (request.type) {
                    case 'link':
                        alertmsg = this.$t('link_alert', request);
                        alert = {msg: alertmsg, id: uuidv4()};

                        this.$store.dispatch("WalletStore/notifyUser", {
                            notify: "request", message: alertmsg
                        });
                        break;
                    default:
                        alertmsg = this.$t('access_alert', request.payload);

                        this.$store.dispatch("WalletStore/notifyUser", {
                            notify: "request", message: alertmsg
                        });
                        alert = {msg: alertmsg, id: uuidv4()};
                        break;
                }
                //let alert={msg:msg, id: uuidv4()};
                this.alerts.push(alert);
            },
            hideAlert: function (id) {
                let index = this.alerts.findIndex(function (o) {
                    return o.id === id;
                })
                if (index !== -1) this.alerts.splice(index, 1);
            },
            requestAccess: function (request) {

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
            requestVote: async function (request) {
                this.$store.dispatch("WalletStore/notifyUser", {
                    notify: "request", message: "request"
                });
                this.incoming = request;
                this.incoming.action = "vote";

                let mappedData = await this.blockchain.mapOperationData(this.incoming);
                this.specifics = mappedData.specifics;
                this.incoming.vote_id = mappedData.vote_id;

                this.genericmsg = this.$t(
                    'operations:vote.request',
                    {
                        origin: this.incoming.origin,
                        entity: mappedData.entity
                    }
                );
                this.generictitle = this.$t('operations:vote.title');
                this.genericaccept = this.$t('operations:vote.accept_btn');
                this.genericreject = this.$t('operations:vote.reject_btn');
                this.$refs.genericReqModal.show();
                return new Promise((res, rej) => {
                    this.incoming.acceptgen = res;
                    this.incoming.rejectgen = rej;
                });
            },
            requestTx: function (request) {
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
            allowAccess: function () {
                this.$refs.accountReqModal.hide();
                this.incoming.accept({
                    account: this.$store.state.WalletStore.wallet.accountName,
                    id: this.$store.state.WalletStore.wallet.accountID
                });
            },
            denyAccess: function () {
                this.$refs.accountReqModal.hide();
                this.incoming.reject({});
            },
            acceptTx: async function () {
                this.$refs.loaderAnimModal.show();
                let transaction = await this.blockchain.sign(
                    this.incoming.params,
                    this.$store.state.WalletStore.wallet.keys.active
                );
                let id = await this.blockchain.broadcast(
                    transaction
                );
                this.incoming.accepttx({id: id});
                this.$refs.transactionReqModal.hide();
                this.$refs.loaderAnimModal.hide();
            },
            rejectTx: function () {
                this.$refs.transactionReqModal.hide();
                this.incoming.rejecttx({});
            },
            acceptGeneric: async function () {
                let operation = await Operations.generate(
                    this.incoming,
                    this.$store.state.WalletStore.wallet.accountID
                );
                this.$refs.loaderAnimModal.show();
                let transaction = await this.blockchain.sign(
                    operation,
                    this.$store.state.WalletStore.wallet.keys.active
                );
                let id = await this.blockchain.broadcast(
                    transaction
                );
                this.incoming.acceptgen(id);
                this.$refs.genericReqModal.hide();
                this.$refs.loaderAnimModal.hide();
            },
            rejectGeneric: function () {
                this.$refs.genericReqModal.hide();
                this.incoming.rejectgen({});
            },
            formatMoney: function (n, decimals, decimal_sep, thousands_sep) {
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