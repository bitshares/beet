<script setup>
    import { v4 as uuidv4 } from "uuid";
    import { ref, onMounted, watchEffect } from 'vue';

    import LinkRequestPopup from "./popups/linkrequestpopup";
    import IdentityRequestPopup from "./popups/identityrequestpopup";
    import ReLinkRequestPopup from "./popups/relinkrequestpopup";
    import GenericRequestPopup from "./popups/genericrequestpopup";
    import TransactionRequestPopup from "./popups/transactionrequestpopup";
    import TransferRequestPopup from "./popups/transferrequestpopup";
    import SignMessageRequestPopup from "./popups/signedmessagepopup";

    import getBlockchain from "../lib/blockchains/blockchainFactory";
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    let alerts = ref([]);
    let loaderpromise = ref({});
    let dismissCountDown = ref(0);
    let transientMsg = ref('');
    let transientLink = ref('');

    this.emitter.on("popup", async what => {
        switch (what) {
        case "load-start":
            loaderpromise.value.show = new Promise(resolve => {
                //this.$refs.loaderAnimModal.show();
                loaderpromise.value.resolve = resolve;
            });
            break;
        case "load-end":
            await loaderpromise.value.show;
            //this.$refs.loaderAnimModal.hide();
            break;
        }
    });

    this.emitter.on("tx-success", (data) => {
        dismissCountDown.value = 5;
        transientMsg.value = data.msg;
        transientLink.value = data.link;
    });

    watchEffect(() => $route() {
        alerts.value = [];
    });

    onMounted() {
        logger.debug("Modal mounted");
        this.$root.$on("bv::modal::shown", bvEvent => {
            if (bvEvent.target.id == "loaderAnim") {
                loaderpromise.value.resolve();
            }
        });
    }

    function showAlert(request) {
        let alertmsg = request.type === "link"
            ? this.$t("common.link_alert", request)
            : this.$t("common.access_alert", request.payload);

        this.$store.dispatch("WalletStore/notifyUser", {notify: "request", message: alertmsg});
        alerts.value.push({ msg: alertmsg, id: uuidv4() });
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

            let blockchain = getBlockchain(
              payload_dict.chain
                ? messageChain = payload_dict.chain
                : messageChain = payload_dict.key.substr(0, 3)
            );

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
        <LinkRequestPopup v-if="type === 'linkReqModal'" ref="linkReqModal" />
        <ReLinkRequestPopup v-else-if="type === 'reLinkReqModal'" ref="reLinkReqModal" />
        <IdentityRequestPopup v-else-if="type === 'identityReqModal'" ref="identityReqModal" />
        <SignMessageRequestPopup v-else-if="type === 'signMessageModal'" ref="signMessageModal" />
        <TransferRequestPopup v-else-if="type === 'transferReqModal'" ref="transferReqModal" />
        <TransactionRequestPopup v-else-if="type === 'transactionReqModal'" ref="transactionReqModal" />
        <GenericRequestPopup v-else-if="type === 'genericReqModal'" ref="genericReqModal" />
    </div>
</template>
