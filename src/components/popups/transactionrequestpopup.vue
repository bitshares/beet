<script setup>
    import { ipcRenderer } from 'electron';
    import { computed, onMounted } from "vue";
    import { useI18n } from 'vue-i18n';
    import {formatChain} from "../../lib/formatter";
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
        visualizedAccount: {
            type: String,
            required: true,
            default() {
                return ''
            }
        },
        visualizedParams: {
            type: String,
            required: true,
            default() {
                return ''
            }
        }
    });

    let visualizedParams = computed(() => {
        if (!props.visualizedParams) {
            return '';
        }
        return props.visualizedParams;
    });

    let tableTooltip = computed(() => {
        if (!props.request) {
            return '';
        }

        return t(
            'operations.rawsig.request',
            {
                appName: props.request.payload.appName,
                origin: props.request.payload.origin,
                chain: formatChain(props.request.payload.chain),
                accountName: props.visualizedAccount ? props.visualizedAccount : props.request.payload.account_id
            }
        );
    });

    let buttonText = computed(() => {
        if (!props.request) {
            return '';
        }

        return props.request.payload.params &&
            props.request.payload.params.length > 0 &&
            props.request.payload.params[0] == "sign"
            ? t('operations.rawsig.sign_btn')
            : t('operations.rawsig.sign_and_broadcast_btn')
    })

    onMounted(() => {
        logger.debug("Transaction request popup initialised");
        console.log({visualizedParams})
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
    <div style="padding-bottom:5px;">
        {{ tableTooltip }}
    </div>
    <div
        v-if="!!visualizedParams"
        class="text-left custom-content"
    >
        {{ t('operations.general.content') }}
        <ul>
            <li
                v-for="param in visualizedParams.split(/\r?\n/)"
                :key="param"
                style="list-style-type: none"
            >
                {{ param }}
            </li>
        </ul>
    </div>
    <div
        v-else
        class="text-left custom-content"
    >
        <pre>
            {{ t('operations.rawsig.loading') }}
        </pre>
    </div>

    <h4 class="h4 beet-typo-small">
        {{ t('operations.rawsig.request_cta') }}
    </h4>

    <span v-if="!!visualizedParams">
        <ui-button
            raised
            style="margin-right:5px"
            @click="_clickedAllow()"
        >
            {{ buttonText }}
        </ui-button>
        <ui-button
            raised
            @click="_clickedDeny()"
        >
            {{ t('operations.rawsig.reject_btn') }}
        </ui-button>
    </span>
    <span v-else>
        <ui-button
            raised
            style="margin-right:5px"
            disabled
        >
            {{ buttonText }}
        </ui-button>
        <ui-button
            raised
            @click="_clickedDeny()"
        >
            {{ t('operations.rawsig.reject_btn') }}
        </ui-button>
    </span>
</template>
