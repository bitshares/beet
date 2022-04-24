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
        accounts: {
            type: Array,
            required: true,
            default() {
                return []
            }
        }
    });

    let requestText = computed(() => {
        if (!props.request || !props.request.accounts) {
            return '';
        }
        return t("operations.message.request", {
            appName: props.request.appName,
            origin: props.request.origin,
            chain: props.accounts[0].chain, // FIX
            accountName: props.accounts[0].accountName
        });
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

    onMounted(() => {
        logger.debug("Signed message popup initialised");
    });
</script>

<template>
    {{ message }}:
    <br>
    <br>
    <pre class="text-left custom-content"><code>{{ props.request.params }}</code></pre>
    <ui-button
        raised
        @click="_clickedAllow()"
    >
        {{ t("operations.message.accept_btn") }}
    </ui-button>
    <ui-button
        raised
        @click="_clickedDeny()"
    >
        {{ t("operations.message.reject_btn") }}
    </ui-button>
</template>
