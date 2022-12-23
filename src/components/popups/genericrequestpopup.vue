<script setup>
    import { ipcRenderer } from 'electron';
    import { onMounted, computed } from "vue";
    import { useI18n } from 'vue-i18n';
    import RendererLogger from "../../lib/RendererLogger";

    const { t } = useI18n({ useScope: 'global' });
    const logger = new RendererLogger();

    const props = defineProps({
        request: {
            type: Object,
            required: true,
            default() {
                return {}
            }
        },
        payload: {
            type: Object,
            required: true,
            default() {
                return {}
            }
        },
        warning: {
            type: String,
            required: false,
            default() {
                return ''
            }
        }
    });

    let acceptText = computed(() => {
        if (!props.payload) {
            return '';
        }
        return props.payload.generic.acceptText ?? t('operations.rawsig.accept_btn');
    });

    let rejectText = computed(() => {
        if (!props.payload) {
            return '';
        }
        return props.payload.generic.rejectText ?? t('operations.rawsig.reject_btn');
    });

    let votePrompt = computed(() => {
        if (!props.payload) {
            return '';
        }
        return props.payload.generic.details.split(/\r?\n/);
    });

    let warning = computed(() => {
        if (!props.warning || !props.warning.length) {
            return;
        }
        return props.warning;
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
    <div style="padding:5px">
        <p>
            {{ props.payload.generic.message }}:
        </p>

        <ui-list>
            <ui-item
                v-for="item in votePrompt"
                :key="item"
            >
                <ui-item-text-content>
                    {{ item }}
                </ui-item-text-content>
            </ui-item>
        </ui-list>

        <ui-alert
            v-if="warning"
            state="warning"
        >
            {{
                warning === "serverError"
                    ? t("operations.transfer.server_error")
                    : t("operations.transfer.detected_scammer")
            }}
        </ui-alert>

        <ui-button
            raised
            style="margin-right:5px"
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
</template>
