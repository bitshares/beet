<script setup>
    import { ipcRenderer } from 'electron';
    import { computed } from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import {formatChain} from "../../lib/formatter";

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
            {{ tableTooltip }}
        </p>
        <div
            v-if="!!visualizedParams"
            class="text-left custom-content"
        >
            <h4 class="h4 beet-typo-small">
                {{ t('operations.general.content') }}
            </h4>
            <ui-textfield
                v-model="visualizedParams"
                input-type="textarea"
                fullwidth
                disabled
                rows="5"
            />
        </div>
        <div
            v-else
            class="text-left custom-content"
        >
            <pre>
                Loading transaction details from blockchain, please wait.
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
    </div>
</template>
