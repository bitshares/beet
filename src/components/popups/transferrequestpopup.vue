<script setup>
    import { ipcRenderer } from 'electron';
    import { onMounted, computed } from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import getBlockchainAPI from "../../lib/blockchains/blockchainFactory";
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    const props = defineProps({
        request: Object,
        accounts: Array
    });

    let message = computed(() => {
        return t("operations.transfer.request", {
            appName: props.request.appName,
            origin: props.request.origin,
            chain: props.accounts[0].accountID.chain,
            accountName: props.accounts[0].accountID.accountName
        });
    });

    let to = computed(() => {
        return props.request.params.to;
    });

    let satoshis = computed(() => {
        return props.request.params.amount.satoshis;
    });

    let asset_id = computed(() => {
        return props.request.params.amount.asset_id;
    });

    let toSend = computed(() => {
        let blockchain = getBlockchainAPI(props.request.chain);
        return blockchain.format(props.request.params.amount);
    });

    let toSendFee = computed(() => {
        return props.request.toSendFee ?? null;
    });

    let feeInSatoshis = computed(() => {
        return props.request.feeInSatoshis ?? null;
    });

    onMounted(() => {
        logger.debug("Transfer request popup initialised");
    });

    function _clickedAllow() {
        ipcRenderer.send(
            "clickedAllow",
            {
                response: {success: true},
                request: {id: props.request.id}
            }
        );
    }

    function _clickedDeny() {
        ipcRenderer.send(
            "clickedDeny",
            {
                response: {canceled: true},
                request: {id: props.request.id}
            }
        );
    }
</script>
<template>
    {{ message }}:
    <br>
    <br>
    <pre class="text-left custom-content">
      <span v-if="toSendFee">
        <code>
          Recipient: {{ to }}
          Amount: {{ toSend }}
          Fee: {{ toSendFee }}
        </code>
      </span>
      <span v-else>
        <code>
          Recipient: {{ to }}
          Amount: {{ toSend }}
        </code>
      </span>
    </pre>
    <ui-button
        raised
        @click="_clickedAllow()"
    >
        {{ t("operations.transfer.accept_btn") }}
    </ui-button>
    <ui-button
        raised
        @click="_clickedDeny()"
    >
        {{ t("operations.transfer.reject_btn") }}
    </ui-button>
</template>
