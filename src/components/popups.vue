<script setup>
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

    import { ref, onMounted, watchEffect } from 'vue';

    import RendererLogger from "../lib/RendererLogger";
    import SignMessageRequestPopup from "./popups/signedmessagepopup";
    const logger = new RendererLogger();

    let alerts = ref([]);
    let loaderpromise = ref({});
    let dismissCountDown = ref(0);
    let transientMsg = ref('');
    let transientLink = ref('');

    EventBus.$on("popup", async what => {
        switch (what) {
        case "load-start":
            loaderpromise.value.show = new Promise(resolve => {
                this.$refs.loaderAnimModal.show();
                loaderpromise.value.resolve = resolve;
            });
            break;
        case "load-end":
            await loaderpromise.value.show;
            this.$refs.loaderAnimModal.hide();
            break;
        }
    });

    EventBus.$on("tx-success", (data) => {
        dismissCountDown.value = 5;
        transientMsg.value = data.msg;
        transientLink.value = data.link;
    });

    watchEffect(() => $route() {
        alerts.value = [];
    });

    onMounted() {
        logger.debug("Popup Service panel mounted");
        this.$root.$on("bv::modal::shown", bvEvent => {
            if (bvEvent.target.id == "loaderAnim") {
                loaderpromise.value.resolve();
            }
        });
    }

    function openExplorer (link) {
        shell.openExternal(link);
    }

    function countDownChanged(countdownChange) {
        dismissCountDown.value = countdownChange.value;
    }

    function showAlert(request) {
        let alert;
        let alertmsg;
        switch (request.type) {
        case "link":
            alertmsg = this.$t("common.link_alert", request);
            alert = { msg: alertmsg, id: uuidv4() };

            this.$store.dispatch("WalletStore/notifyUser", {
                notify: "request",
                message: alertmsg
            });
            break;
        default:
            alertmsg = this.$t("common.access_alert", request.payload);

            this.$store.dispatch("WalletStore/notifyUser", {
                notify: "request",
                message: alertmsg
            });
            alert = { msg: alertmsg, id: uuidv4() };
            break;
        }
        alerts.value.push(alert);
    }

    function hideAlert(id) {
        let index = alerts.value.findIndex(function(o) {
            return o.id === id;
        });
        if (index !== -1) {
          alerts.value.splice(index, 1);
        }
    }

    async function requestAccess(request) {
        return this.$refs.identityReqModal.show(request);
    }

    async function requestLink(request) {
        return this.$refs.linkReqModal.show(request);
    }

    async function requestReLink(request) {
        return this.$refs.reLinkReqModal.show(request);
    }

    async function requestTransfer(request) {
        return this.$refs.transferReqModal.show(request);
    }

    function requestVote(payload) {
        payload.action = "vote";
        let blockchain = getBlockchain(payload.chain);
        let mappedData = await blockchain.mapOperationData(payload);

        let generic = {
            title: this.$t("operations.vote.title"),
            message: this.$t("operations.vote.request", {
                appName: payload.appName,
                origin: payload.origin,
                entity: mappedData.entity,
                chain: payload.chain,
                accountName: payload.account_id
            }),
            details: mappedData.description,
            acceptText: this.$t("operations.vote.accept_btn"),
            rejectText: this.$t("operations.vote.reject_btn")
        };
        payload.generic = generic;
        payload.vote_id = mappedData.vote_id;
        return this.$refs.genericReqModal.show(payload, false);
    }

    function requestTx(payload) {
        return this.$refs.transactionReqModal.show(payload);
    }

    function isWhitelisted(identity, method) {
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
    }

    async function requestSignedMessage(payload) {
        if (isWhitelisted(payload.identityhash, "SignMessageRequestPopup")) {
            return {
                response: await this.$refs.signMessageModal.execute(payload),
                whitelisted: true
            };
        } else {
            return this.$refs.signMessageModal.show(payload, true);
        }
    }

    function verifyMessage(payload) {
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
</script>

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
