<script setup>
    import {ref, onMounted} from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import AbstractPopup from "./abstractpopup";
    import store from '../store/index';
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    let type = ref("ReLinkRequestPopup");
    let chosenAccount = ref({ trackId: 0 });
    let beetapp = ref({});

    onMounted(() => {
      logger.debug("Relink Popup initialised");
    });

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
