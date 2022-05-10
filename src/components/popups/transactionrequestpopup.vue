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
            type: String, // md5
            required: true,
            default() {
                return ''
            }
        }
    });

    let visualizedAccount = computed(() => {
        if (!props.visualizedAccount) {
            return '';
        }
        return atob(props.visualizedAccount);
    });

    let visualizedParams = computed(() => {
        if (!props.visualizedParams) {
            return '';
        }
        return atob(props.visualizedParams);
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
                accountName: props.request.payload.account_id
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
    <table
        v-tooltip="tableTooltip"
        class="table small table-striped table-sm"
    >
        <tbody>
            <tr>
                <td class="text-left">
                    Origin:
                </td>
                <td class="text-right">
                    {{ props.request.payload.origin }}
                </td>
            </tr>
            <tr>
                <td class="text-left">
                    App:
                </td>
                <td class="text-right">
                    {{ props.request.payload.appName }}
                </td>
            </tr>
            <tr>
                <td class="text-left">
                    Account:
                </td>
                <td class="text-right">
                    {{ formatChain(props.request.payload.chain) + ":" + (visualizedAccount) }}
                </td>
            </tr>
            <tr>
                <td class="text-left">
                    Action:
                </td>
                <td class="text-right">
                    {{ buttonText }}
                </td>
            </tr>
        </tbody>
    </table>

    <div
        v-if="!!visualizedParams"
        class="text-left custom-content"
    >
        <h4 class="h4 beet-typo-small">
            {{ t('operations.general.content') }}
        </h4>
        <pre class="text-left custom-content">
        <code>
          {{ visualizedParams }}
        </code>
      </pre>
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
