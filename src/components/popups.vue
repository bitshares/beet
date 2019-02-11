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
            {{ $t('operations:any_account_id.request',{origin: incoming.origin }) }}
            <br>
            <br>
            {{ $t('operations:any_account_id.request_cta') }}
            <AccountSelect v-model="chosenAccount" />
            
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
            {{ $t('operations:rawsig.request',{origin: incoming.origin , chain: signingAccount.chain, accountName: signingAccount.accountName}) }}
            <br>
            <br>
            <pre
                v-if="!!incoming.params"
                class="text-left custom-content"
            >
                <code>
    {
    {{ incoming.params }}
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
            :title="generictitle"
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
                {{ genericaccept || $t('operations:rawsig.accept_btn') }}
            </b-btn>
            <b-btn
                class="mt-1"
                variant="danger"
                block
                @click="rejectGeneric"
            >
                {{ genericreject || $t('operations:rawsig.reject_btn') }}
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
    import AccountSelect from "./account-select";

    import getBlockchain from "../lib/blockchains/blockchainFactory"

    export default {
        name: "Popups",
        i18nOptions: {namespaces: ["common", "operations"]},
        components: {AccountSelect },
        data() {
            return {
                genericmsg: '',
                alerts: [],
                api: null,
                incoming: {},
                specifics: "",
                signingAccount: {},
                chosenAccount: this.$store.state.AccountStore.accountlist[0]
            };
        },
        watch: {
            $route(to, from) {
                this.alerts = [];
            },
            incoming(to, from) {
                if (to!={}) {
                    let signing=this.$store.state.AccountStore.accountlist.filter( x => { return (x.accountID==this.incoming.account_id && x.chain==this.incoming.chain);})
                    this.signingAccount=signing[0];
                }else{
                    this.signingAccount={};
                }
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
                //let blockchain = getBlockchain(this.$store.state.WalletStore.wallet.chain);
                let blockchain = getBlockchain(this.incoming.chain);
                let mappedData = await blockchain.mapOperationData(this.incoming);
                this.specifics = mappedData.description;
                this.incoming.vote_id = mappedData.vote_id;

                this.genericmsg = this.$t(
                    'operations:vote.request',
                    {
                        origin: this.incoming.origin,
                        entity: mappedData.entity,
                        chain: this.signingAccount.chain,
                        accountName: this.signingAccount.accountName
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
            requestTx: function (payload) {
                this.$store.dispatch("WalletStore/notifyUser", {
                    notify: "request", message: "request"
                });
                this.incoming = payload;
                this.$refs.transactionReqModal.show();
                return new Promise((res, rej) => {
                    this.incoming.accepttx = res;
                    this.incoming.rejecttx = rej;
                });
            },
            requestSignedMessage: function (payload) {
                this.$store.dispatch("WalletStore/notifyUser", {
                    notify: "request", message: "request"
                });
                this.incoming = payload;

                this.specifics = payload.params;

                this.genericmsg = this.$t(
                    'operations:message.request',
                    {
                        origin: this.incoming.origin,                        
                        chain: this.signingAccount.chain,
                        accountName: this.signingAccount.accountName
                    }
                );
                this.generictitle = this.$t('operations:message.title');
                this.genericaccept = this.$t('operations:message.accept_btn');
                this.genericreject = this.$t('operations:message.reject_btn');
                this.$refs.genericReqModal.show();
                return new Promise((res, rej) => {
                    this.incoming.acceptgen = res;
                    this.incoming.rejectgen = rej;
                });
            },
            verifyMessage: function (payload) {
                console.log("verify", payload);
                return new Promise((resolve, reject) => {
                    let payload_dict = {};
                    payload_dict[payload.params.payload[0]] = [payload_dict[payload.params.payload[1]], payload_dict[payload.params.payload[2]]];
                    let i;
                    for (i = 3; i < payload.params.payload.length-1; i++) {
                        payload_dict[payload.params.payload[i]] = payload.params.payload[i+1];
                    }
                    let messageChain = null;
                    if (payload_dict.chain) {
                        messageChain = payload_dict.chain;
                    } else {
                        messageChain = payload.params.payload[2].substr(0,3);
                    }
                    let blockchain = getBlockchain(messageChain);
                    blockchain.verifyMessage(
                        payload.params
                    ).then((result) => {
                        resolve(result);
                    }).catch(err => {
                        reject(err);
                    });
                });
            },
            allowAccess: function () {
                console.log(this.chosenAccount);
                this.$refs.accountReqModal.hide();
                this.incoming.accept({
                    name: this.chosenAccount.accountName,
                    id: this.chosenAccount.accountID
                });
            },
            denyAccess: function () {
                this.$refs.accountReqModal.hide();
                this.incoming.reject({});
            },
            acceptTx: async function () {
                this.$refs.loaderAnimModal.show();
                this.$refs.transactionReqModal.hide();
                let blockchain = getBlockchain(this.incoming.chain);
                let transaction = await blockchain.sign(
                    this.incoming.params,
                    this.signingAccount.keys.active
                );
                let id = await blockchain.broadcast(
                    transaction
                );
                this.incoming.accepttx({id: id});
                this.$refs.loaderAnimModal.hide();
            },
            rejectTx: function () {
                this.$refs.transactionReqModal.hide();
                this.incoming.rejecttx({});
            },
            acceptGeneric: async function () {
                // doesnt disappear afterwards, huh?
                //this.$refs.loaderAnimModal.show();
                let blockchain = getBlockchain(this.incoming.chain);
                if (this.incoming.method == "signMessage") {
                    let signedMessage = await blockchain.signMessage(
                        this.signingAccount.keys.active,
                        this.signingAccount.accountName,
                        this.incoming.params
                    );
                    this.incoming.acceptgen(signedMessage);
                } else {
                    let operation = await blockchain.getOperation(
                        this.incoming,
                        {
                            id: this.signingAccount.accountID,
                            name: this.signingAccount.accountName
                        }
                    );
                    let transaction = await blockchain.sign(
                        operation,
                        this.signingAccount.keys.active
                    );
                    let id = await blockchain.broadcast(
                        transaction
                    );
                    this.incoming.acceptgen(id);
                }
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