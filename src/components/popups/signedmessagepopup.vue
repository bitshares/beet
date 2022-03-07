<script setup>
    import {ref} from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import AbstractPopup from "./abstractpopup";
    import store from '../store/index';
    import {getKey} from '../../lib/SecureRemote';
    import getBlockchain from "../../lib/blockchains/blockchainFactory";
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    let type = ref("SignMessageRequestPopup");
    let askWhitelist = ref(false);
    let message = ref(null);

    function _onShow() {
        this.message = t("operations.message.request", {
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
