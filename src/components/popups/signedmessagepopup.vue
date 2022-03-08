<script setup>
    import {ref, onMounted} from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import store from '../store/index';
    import {getKey} from '../../lib/SecureRemote';
    import getBlockchain from "../../lib/blockchains/blockchainFactory";
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    let type = ref("SignMessageRequestPopup");
    let askWhitelist = ref(false);
    let message = ref(null);

    //
    let type = ref(null);
    let error = ref(false);
    let incoming = ref({});
    let api = ref(null);
    let allowWhitelist = ref(false);
    //

    onMounted(() => {
      logger.debug("Signed message popup initialised");
      store.dispatch("WalletStore/notifyUser", {notify: "request", message: message}); //show alert instead?
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

    function _execute() {
        // to overwrite
        throw "Needs implementation"
    }

    function execute(payload) {
        this.incoming = payload;
        return new Promise((resolve,reject) => {
            try {
                resolve(this._execute());
            } catch (err) {
                reject(err);
            }
        });
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
        message.value = t("operations.message.request", {
            appName: this.incoming.appName,
            origin: this.incoming.origin,
            chain: store.getters['AccountStore/getSigningKey'](this.incoming).chain,
            accountName: store.getters['AccountStore/getSigningKey'](this.incoming).accountName
        });
    }

    function getSuccessNotification(result) {
        return {msg: 'Message successfully signed.', link: '' };
    }

    async function _execute() {
        let blockchain = getBlockchain(this.incoming.chain);

        let keys = store.getters['AccountStore/getSigningKey'](this.incoming).keys;

        let signatureKey = null;
        if (keys.memo) {
            signatureKey = keys.memo;
        } else {
            signatureKey = keys.active;
        }

        return await blockchain.signMessage(
            await getKey(signatureKey),
            store.getters['AccountStore/getSigningKey'](this.incoming).accountName,
            this.incoming.params
        );
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
        :title="t('operations.message.title')"
    >
        {{ message }}:
        <br>
        <br>
        <pre class="text-left custom-content"><code>{{ incoming.params }}</code></pre>
        <b-form-checkbox
            v-if="askWhitelist"
            v-model="allowWhitelist"
        >
            {{ t('operations.whitelist.prompt', { method: incoming.method }) }}
        </b-form-checkbox>
        <b-btn
            class="mt-3"
            variant="success"
            block
            @click="_clickedAllow"
        >
            {{ t("operations.message.accept_btn") }}
        </b-btn>
        <b-btn
            class="mt-1"
            variant="danger"
            block
            @click="_clickedDeny"
        >
            {{ t("operations.message.reject_btn") }}
        </b-btn>
    </b-modal>
</template>
