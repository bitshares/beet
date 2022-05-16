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
        }
    });

    let acceptText = computed(() => {
        if (!props.request) {
            return '';
        }
        return props.request.generic.acceptText ?? t('operations.rawsig.accept_btn');
    });

    let rejectText = computed(() => {
        if (!props.request) {
            return '';
        }
        return props.request.generic.rejectText ?? t('operations.rawsig.reject_btn');
    });

    onMounted(() => {
        logger.debug("Req Popup initialised");
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
    <div v-if="_accept">
        {{ props.request.generic.message }}:
        <br>
        <br>
        <pre class="text-left custom-content"><code>{{ props.request.generic.details }}</code></pre>

        <ui-button
            raised
            @click="_clickedAllow()"
        >
            {{ acceptText }}
        </ui-button>

        <ui-button
            outlined
            @click="_clickedDeny()"
        >
            {{ rejectText }}
        </ui-button>
    </div>
    <div v-else>
        Loading beet modal contents
    </div>
</template>
