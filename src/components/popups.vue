<template>
    <div>
        <LinkRequestPopup ref="linkReqModal" />
        <ReLinkRequestPopup ref="reLinkReqModal" />
        <IdentityRequestPopup ref="identityReqModal" />

        <SignMessageRequestPopup ref="signMessageModal" />
        <TransferRequestPopup ref="transferReqModal" />

        <TransactionRequestPopup ref="transactionReqModal" />
        <GenericRequestPopup ref="genericReqModal" />

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
            <b-alert
                :show="dismissCountDown"
                dismissible
                variant="primary"
                fade
                @dismissed="dismissCountDown=0"
                @dismiss-count-down="countDownChanged"
            >
                {{ transientMsg }}
                <a
                    v-if="transientLink!=''"
                    href="#"
                    @click="openExplorer(transientLink)"
                >
                    {{ transientLink }}
                </a>
            </b-alert>
        </div>
    </div>
</template>
<script>
    import { v4 as uuidv4 } from "uuid";
    import { EventBus } from "../lib/event-bus.js";
    import getBlockchain from "../lib/blockchains/blockchainFactory";
    import LinkRequestPopup from "./popups/linkrequestpopup";
    import IdentityRequestPopup from "./popups/identityrequestpopup";
    import ReLinkRequestPopup from "./popups/relinkrequestpopup";
    import GenericRequestPopup from "./popups/genericrequestpopup";
    import TransactionRequestPopup from "./popups/transactionrequestpopup";
    import TransferRequestPopup from "./popups/transferrequestpopup";
    import { shell } from 'electron';


    import RendererLogger from "../lib/RendererLogger";
    import SignMessageRequestPopup from "./popups/signedmessagepopup";
    const logger = new RendererLogger();

    export default {
        name: "Popups",
        i18nOptions: { namespaces: ["common", "operations"] },
        components: {
            SignMessageRequestPopup,
            TransactionRequestPopup,
            IdentityRequestPopup,
            ReLinkRequestPopup,
            LinkRequestPopup,
            GenericRequestPopup,
            TransferRequestPopup
        },
        data() {
            return {
                alerts: [],
                loaderpromise: {},
                dismissCountDown: 0,
                transientMsg: '',
                transientLink: ''
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
                    this.loaderpromise.show = new Promise(resolve => {
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

            EventBus.$on("tx-success", (data) => {
                this.dismissCountDown=5;
                this.transientMsg=data.msg;
                this.transientLink=data.link;
            });
        },
        mounted() {
            logger.debug("Popup Service panel mounted");
            this.$root.$on("bv::modal::shown", bvEvent => {
                if (bvEvent.target.id == "loaderAnim") {
                    this.loaderpromise.resolve();
                }
            });
        },
        methods: {
            openExplorer: function(link) {
                shell.openExternal(link);
            },
            countDownChanged(dismissCountDown) {
                this.dismissCountDown = dismissCountDown;
            },
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
            requestAccess: async function(request) {
                return this.$refs.identityReqModal.show(request);
            },
            requestLink: async function(request) {
                return this.$refs.linkReqModal.show(request);
            },
            requestReLink: async function(request) {
                return this.$refs.reLinkReqModal.show(request);
            },
            requestTransfer: async function(request) {
                return this.$refs.transferReqModal.show(request);
            },
            requestVote: async function(payload) {
                payload.action = "vote";
                let blockchain = getBlockchain(payload.chain);
                let mappedData = await blockchain.mapOperationData(payload);

                let generic = {
                    title: this.$t("operations:vote.title"),
                    message: this.$t("operations:vote.request", {
                        appName: payload.appName,
                        origin: payload.origin,
                        entity: mappedData.entity,
                        chain: payload.chain,
                        accountName: payload.account_id
                    }),
                    details: mappedData.description,
                    acceptText: this.$t("operations:vote.accept_btn"),
                    rejectText: this.$t("operations:vote.reject_btn")
                };
                payload.generic = generic;
                payload.vote_id = mappedData.vote_id;
                return this.$refs.genericReqModal.show(payload, false);
            },
            requestTx: async function(payload) {
                return this.$refs.transactionReqModal.show(payload);
            },
            isWhitelisted: function(identity, method) {
                if (
                    !!this.$store.state.WhitelistStore &&
                    !!this.$store.state.WhitelistStore.whitelist &&
                    !!this.$store.state.WhitelistStore.whitelist.filter
                ) {
                    if (
                        this.$store.state.WhitelistStore.whitelist.filter(
                            x => x.identityhash == identity && x.method == method
                        ).length > 0
                    ) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            },
            requestSignedMessage: async function(payload) {
                if (this.isWhitelisted(payload.identityhash, "SignMessageRequestPopup")) {
                    return {
                        response: await this.$refs.signMessageModal.execute(payload),
                        whitelisted: true
                    };
                } else {
                    return this.$refs.signMessageModal.show(payload, true);
                }
            },
            verifyMessage: function(payload) {
                return new Promise((resolve, reject) => {
                    let payload_dict = {};
                    let payload_list = payload.params.payload;
                    if (payload_list[2] == "key") {
                        for (let i = 0; i < payload_list.length - 1; i = i+2) {
                            payload_dict[payload_list[i]] = payload_list[i + 1];
                        }
                    } else {
                        for (let i = 3; i < payload_list.length - 1; i = i+2) {
                            payload_dict[payload_list[i]] = payload_list[i + 1];
                        }
                        payload_dict.key = payload_list[2];
                        payload_dict.from = payload_list[1];
                    }
                    let messageChain = null;
                    if (payload_dict.chain) {
                        messageChain = payload_dict.chain;
                    } else {
                        messageChain = payload_dict.key.substr(0, 3);
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
