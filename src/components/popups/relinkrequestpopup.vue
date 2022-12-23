<script setup>
    import { ipcRenderer } from 'electron';
    import { onMounted, computed} from "vue";
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
        accounts: {
            type: Array,
            required: true,
            default() {
                return []
            }
        }
    });

    let requestText = computed(() => {
        if (!props.request || !props.accounts.length) {
            return '';
        }

        return t(
            'operations.relink.request',
            {
                appName: props.request.appName,
                origin: props.request.origin,
                chain: props.request.chain,
                accountId: props.accounts[0].accountID
            }
        );
    });

    onMounted(() => {
        logger.debug("Relink Popup initialised");
    });

    function _clickedAllow() {
        ipcRenderer.send(
            "clickedAllow",
            {
                result: {
                    identityhash: props.request.payload.identityhash,
                    name: props.accounts[0].accountName,
                    chain: props.accounts[0].chain,
                    id: props.accounts[0].accountID,
                    success: true
                },
                request: {
                    id: props.request.id
                }
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
    <div
        v-if="props.request && props.accounts"
        style="padding:5px"
    >
        <div v-tooltip="t('operations.relink.request_tooltip')">
            {{ requestText }} &#10068;
        </div>
        <br>
        <ui-button
            raised
            style="margin-right:5px"
            @click="_clickedAllow()"
        >
            {{ t('operations.link.accept_btn') }}
        </ui-button>
        <ui-button
            raised
            @click="_clickedDeny()"
        >
            {{ t('operations.link.reject_btn') }}
        </ui-button>
    </div>
    <div
        v-else
        style="padding:5px"
    >
        <ui-alert
            v-if="!chainOperations"
            state="error"
        >
            {{ t('operations.relink.error') }}
        </ui-alert>
        <br>
        <ui-button
            raised
            @click="_clickedDeny()"
        >
            {{ t('operations.link.reject_btn') }}
        </ui-button>
    </div>
</template>
