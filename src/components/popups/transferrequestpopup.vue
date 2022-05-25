<script setup>
    import { ipcRenderer } from 'electron';
    import { onMounted, computed } from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    const props = defineProps({
        request: {
            type: Object,
            required: true,
            default() {
                return {}
            }
        },
        chain: {
            type: String,
            required: true,
            default() {
                return ''
            }
        },
        accountName: {
            type: String,
            required: true,
            default() {
                return ''
            }
        },
        toSend: {
            type: String,
            required: true,
            default() {
                return ''
            }
        }
    });

    let message = computed(() => {
        if (!props.request || !props.chain || !props.accountName) {
            return '';
        }
        return t("operations.transfer.request", {
            appName: props.request.payload.appName,
            origin: props.request.payload.origin,
            chain: props.chain,
            accountName: atob(props.accountName)
        });
    });

    let to = computed(() => {
        if (!props.request) {
            return '';
        }
        return props.request.payload.params.to;
    });

    let satoshis = computed(() => {
        if (!props.request) {
            return '';
        }
        return props.request.payload.params.amount.satoshis;
    });

    let asset_id = computed(() => {
        if (!props.request) {
            return '';
        }
        return props.request.payload.params.amount.asset_id;
    });

    let toSend = computed(() => {
        if (!props.toSend) {
            return '';
        }
        return atob(props.toSend);
    });

    let toSendFee = computed(() => {
        if (!props.request) {
            return '';
        }
        return props.request.payload.params.toSendFee ?? null;
    });

    let feeInSatoshis = computed(() => {
        if (!props.request) {
            return '';
        }
        return props.request.payload.params.feeInSatoshis ?? null;
    });

    onMounted(() => {
        logger.debug("Transfer request popup initialised");
    });

    function _clickedAllow() {
        ipcRenderer.send(
            "clickedAllow",
            {
                result: {success: true},
                request: {id: props.request.id}
            }
        );
    }

    function _clickedDeny() {
        ipcRenderer.send(
            "clickedDeny",
            {
                result: {canceled: true},
                request: {id: props.request.id}
            }
        );
    }
</script>
<template>
    {{ message }}
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
