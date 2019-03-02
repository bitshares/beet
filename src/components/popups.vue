<template>
    <div>
        <LinkRequestPopup ref="accountReqModal"></LinkRequestPopup>
        <LinkRequestPopup ref="anyAccountReqModal"></LinkRequestPopup>
        <SignMessageRequestPopup ref="signMessageModal"></SignMessageRequestPopup>
        <TransactionRequestPopup ref="transactionReqModal"></TransactionRequestPopup>
        <GenericRequestPopup ref="genericReqModal"></GenericRequestPopup>

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
    import { v4 as uuidv4 } from "uuid";
    import { EventBus } from "../lib/event-bus.js";
    import getBlockchain from "../lib/blockchains/blockchainFactory";
    import LinkRequestPopup from "./popups/linkrequestpopup";
    import GenericRequestPopup from "./popups/genericrequestpopup";
    import TransactionRequestPopup from "./popups/transactionrequestpopup";

    import RendererLogger from "../lib/RendererLogger";
    import SignMessageRequestPopup from "./popups/signedmessagepopup";
    const logger = new RendererLogger();

    export default {
        name: "Popups",
        i18nOptions: { namespaces: ["common", "operations"] },
        components: {SignMessageRequestPopup, TransactionRequestPopup, LinkRequestPopup, GenericRequestPopup },
        data() {
            return {
                alerts: [],
                loaderpromise: {}
            };
        },
        watch: {
            $route() {
                this.alerts = [];
            }
        },
        created() {
            EventBus.$on("popup", async what => {
                switch (what) {
                case "load-start":
                    this.loaderpromise.show = new Promise((resolve) => {
                        this.$refs.loaderAnimModal.show();
                        this.loaderpromise.resolve = resolve;                      
                    });
                    break;
                case "load-end":
                    await this.loaderpromise.show;
                    this.$refs.loaderAnimModal.hide();
                    break;
                }
            });
        },
        mounted() {
            logger.debug('Popup Service panel mounted');
            this.$root.$on("bv::modal::shown", bvEvent => {
                if (bvEvent.target.id == "loaderAnim") {
                    this.loaderpromise.resolve();
                }
            });
        },
        methods: {
            showAlert: function(request) {
                let alert;
                let alertmsg;
                switch (request.type) {
                case "link":
                    alertmsg = this.$t("link_alert", request);
                    alert = { msg: alertmsg, id: uuidv4() };

                    this.$store.dispatch("WalletStore/notifyUser", {
                        notify: "request",
                        message: alertmsg
                    });
                    break;
                default:
                    alertmsg = this.$t("access_alert", request.payload);

                    this.$store.dispatch("WalletStore/notifyUser", {
                        notify: "request",
                        message: alertmsg
                    });
                    alert = { msg: alertmsg, id: uuidv4() };
                    break;
                }
                this.alerts.push(alert);
            },
            hideAlert: function(id) {
                let index = this.alerts.findIndex(function(o) {
                    return o.id === id;
                });
                if (index !== -1) this.alerts.splice(index, 1);
            },
            requestLink: async function() {
                throw "Needs implementing";
            },
            requestAccess: async function(request) {
                return this.$refs.accountReqModal.show(
                    request
                );
            },
            requestAnyAccess: async function(request) {
                return this.$refs.anyAccountReqModal.show(
                    request
                );
            },
            _getSigningAccount(request) {
                let signing = this.$store.state.AccountStore.accountlist.filter(x => {
                    return (
                        x.accountID == request.account_id &&
                        x.chain == request.chain
                    );
                });
                if (signing.length !== 1) {
                    throw "Invalid signing accounts count";
                }
                return signing[0];
            },
            requestVote: async function(payload) {
                payload.signingAccount = this._getSigningAccount(payload);
                payload.action = "vote";
                let blockchain = getBlockchain(payload.chain);
                let mappedData = await blockchain.mapOperationData(payload);

                let generic = {
                    title: this.$t("operations:vote.title"),
                    message: this.$t("operations:vote.request", {
                        appName: payload.appName,
                        origin: payload.origin,
                        entity: mappedData.entity,
                        chain: payload.signingAccount.chain,
                        accountName: payload.signingAccount.accountName
                    }),
                    details: mappedData.description,
                    acceptText: this.$t("operations:vote.accept_btn"),
                    rejectText: this.$t("operations:vote.reject_btn")
                };
                payload.generic = generic;
                return this.$refs.genericReqModal.show(
                    payload,
                    false
                );
            },
            requestTx: async function(payload) {
                payload.signingAccount = this._getSigningAccount(payload);
                return this.$refs.transactionReqModal.show(payload);
            },
            isWhitelisted: function (identity,method) {
                if (this.$store.state.WhitelistStore.whitelist.filter( x=> (x.identityhash==identity && x.method==method) ).length>0) {
                    return true;
                }else{
                    return false;
                }
            },
            requestSignedMessage: async function(payload) {
                payload.signingAccount = this._getSigningAccount(payload);
                if (this.isWhitelisted(payload.identityhash, 'SignMessageRequestPopup')) {
                    return this.$refs.signMessageModal.execute(
                        payload
                    );
                } else {
                    return this.$refs.signMessageModal.show(
                        payload,
                        true
                    );
                }
            },
            verifyMessage: function(payload) {
                return new Promise((resolve, reject) => {
                    let payload_dict = {};
                    payload_dict[payload.params.payload[0]] = [
                        payload_dict[payload.params.payload[1]],
                        payload_dict[payload.params.payload[2]]
                    ];
                    let i;
                    for (i = 3; i < payload.params.payload.length - 1; i++) {
                        payload_dict[payload.params.payload[i]] =
                            payload.params.payload[i + 1];
                    }
                    let messageChain = null;
                    if (payload_dict.chain) {
                        messageChain = payload_dict.chain;
                    } else {
                        messageChain = payload.params.payload[2].substr(0, 3);
                    }
                    let blockchain = getBlockchain(messageChain);
                    blockchain
                        .verifyMessage(payload.params)
                        .then(result => {
                            resolve(result);
                        })
                        .catch(err => {
                            reject(err);
                        });
                });
            }
        }
    };
</script> 