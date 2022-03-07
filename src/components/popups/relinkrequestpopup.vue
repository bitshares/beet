<script setup>
    import {ref, onMounted} from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import store from '../store/index';
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    let type = ref("ReLinkRequestPopup");
    let chosenAccount = ref({ trackId: 0 });
    let beetapp = ref({});

    //

    let type = ref(null);
    let error = ref(false);
    let incoming = ref({});
    let api = ref(null);
    let askWhitelist = ref(false);
    let allowWhitelist = ref(false);

    //

    onMounted(() => {
      logger.debug("Relink Popup initialised");
      store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"}); //show alert instead?
    });

    /////////

    async function show(incoming, newWhitelist = null) {
        store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
        incoming.value = incoming;
        if (newWhitelist !== null) {
            askWhitelist.value = newWhitelist;
        }
        _onShow();
        this.$refs.modalComponent.show();
        return new Promise((resolve, reject) => {
            this._accept = resolve;
            this._reject = reject;
        });
    }

    function _onShow() {
        // to overwrite, do nothing in default
    }

    function getSuccessNotification(res) {
        return false;
    }

    async function _clickedAllow() {
        // this.emitter.emit("popup", "load-start");
        // this.emitter.emit("popup", "load-end");
        this.$refs.modalComponent.hide();
        try {
            let result = await _execute();
            let notification = getSuccessNotification(result);
            if (notification) {
                this.emitter.emit("tx-success", notification);
            }
            // todo allowWhitelist move whitelisting to BeetAPI, thus return flag here
            this._accept(
                {
                    response: result,
                    whitelisted: this.allowWhitelist
                }
            );
            if (this.allowWhitelist) {
                // todo: allowWhitelist move whitelisting into BeetAPI
                store.dispatch(
                    "WhitelistStore/addWhitelist",
                    {
                        identityhash: this.incoming.identityhash,
                        method: this.type
                    }
                );
            }
        } catch (err) {
            this._reject({ error: err });
        }
    }

    function _clickedDeny() {
        this.$refs.modalComponent.hide();
        this._reject({ canceled: true });
    }

    function _getLinkedAccount() {
        let account = store.getters['AccountStore/getSigningKey'](this.incoming);
        return {
            id: account.accountID,
            name: account.accountName,
            chain: account.chain
        }
    }

    /////////

    function _onShow() {
        this.error = false;
        console.log("Popup incoming, payload:", this.incoming);
        this.beetapp = store.state.OriginStore.apps.filter(
            x => x.identityhash == this.incoming.payload.identityhash
        )[0];
    }

    function _execute() {
        let account = store.state.AccountStore.accountlist.filter(
            x => x.accountID == this.beetapp.account_id && x.chain == this.beetapp.chain
        );
        return {
            identityhash: this.incoming.payload.identityhash,
            name: account.accountName,
            chain: this.beetapp.chain,
            id: this.beetapp.account_id
        };
    }
</script>

<template>
    <b-modal
        id="type"
        ref="modalComponent"
        centered
        no-close-on-esc
        no-close-on-backdrop
        hide-header-close
        hide-footer
        :title="t('operations.account_id.title')"
    >
        <div v-tooltip="t('operations.relink.request_tooltip')">
            {{ t('operations.relink.request', {appName: incoming.appName, origin: incoming.origin, chain: incoming.chain, accountId: beetapp.account_id }) }} &#10068;
        </div>
        <br>
        <b-btn
            class="mt-3"
            variant="success"
            block
            @click="_clickedAllow"
        >
            {{ t('operations.link.accept_btn') }}
        </b-btn>
        <b-btn
            class="mt-1"
            variant="danger"
            block
            @click="_clickedDeny"
        >
            {{ t('operations.link.reject_btn') }}
        </b-btn>
    </b-modal>
</template>
