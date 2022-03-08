<script setup>
    import { ref, onMounted } from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import store from '../store/index';
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    let type = ref("IdentityRequestPopup");
    let beetapp = ref({});
    let idaccount = ref({});

    ///

    let type = ref(null);
    let error = ref(false);
    let incoming = ref({});
    let api = ref(null);
    let allowWhitelist = ref(false);

    ///

    onMounted(() => {
      logger.debug("Link Popup initialised");
      store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
    });

    /////////

    async function show(incoming, newWhitelist = null) {
        store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
        incoming.value = incoming;
        _onShow();
        this.$refs.modalComponent.show();
        return new Promise((resolve, reject) => {
            this._accept = resolve;
            this._reject = reject;
        });
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
        let shownBeetApp = store.state.OriginStore.apps.filter(
            x => x.identityhash == incoming.identityhash
        )[0];

        idaccount.value = store.state.AccountStore.accountlist.filter(
            x => {  return  x.accountID == shownBeetApp.account_id && x.chain == shownBeetApp.chain; }
        )[0];

        beetapp.value = shownBeetApp;
    }

    function _execute() {
        return {
            name: idaccount.value.accountName,
            chain: beetapp.value.chain,
            id: beetapp.value.account_id
        };
    }
</script>

<template>
    <b-modal
        id="type"
        ref="modalComponent"
        class="linkStyle"
        centered
        no-close-on-esc
        no-close-on-backdrop
        hide-header-close
        hide-footer
        :title="t('operations.account_id.title')"
    >
        <div v-tooltip="t('operations.identity.request_tooltip')">
            {{ t('operations.account_id.request', {appName: incoming.appName, origin: incoming.origin, chain: incoming.chain, accountId: beetapp.account_id, accountName: idaccount.accountName }) }} &#10068;
        </div>
        <b-btn
            class="mt-3"
            variant="success"
            block
            @click="_clickedAllow"
        >
            {{ t('operations.account_id.accept_btn') }}
        </b-btn>
        <b-btn
            class="mt-1"
            variant="danger"
            block
            @click="_clickedDeny"
        >
            {{ t('operations.account_id.reject_btn') }}
        </b-btn>
    </b-modal>
</template>
