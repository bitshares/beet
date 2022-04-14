<script setup>
    import { ipcRenderer } from 'electron';
    import { computed } from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import getBlockchainAPI from "../../lib/blockchains/blockchainFactory";
    import {formatChain} from "../../lib/formatter";

    const props = defineProps({
        request: Object
    });

    let visualizedParams = computed(async () => {
        let blockchain = getBlockchainAPI(props.request.chain);
        let visualisation;
        try {
            visualisation = await blockchain.visualize(props.request.params);
        } catch (error) {
            console.log(error);
        }

        return visualisation ?? null;
    });

    let visualizedAccount = computed(async () => {
        let blockchain = getBlockchainAPI(props.request.chain);

        let visualisation;
        try {
            visualisation = await blockchain.visualize(props.request.account_id);
        } catch (error) {
            console.log(error);
        }

        return visualisation ?? null;
    });

    let tableTooltip = computed(() => {
        return t(
            'operations.rawsig.request',
            { appName: props.request.appName,
              origin: props.request.origin,
              chain: formatChain(props.request.chain),
              accountName: props.request.account_id
            }
        );
    });

    let buttonText = computed(() => {
        return props.request.params &&
            props.request.params.length > 0 &&
            props.request.params[0] == "sign"
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
                    Origin
                </td>
                <td class="text-right">
                    {{ props.request.origin }}
                </td>
            </tr>
            <tr>
                <td class="text-left">
                    App
                </td>
                <td class="text-right">
                    {{ props.request.appName }}
                </td>
            </tr>
            <tr>
                <td class="text-left">
                    Account
                </td>
                <td class="text-right">
                    {{ formatChain(props.request.chain) + ":" + (visualizedAccount) }}
                </td>
            </tr>
            <tr>
                <td class="text-left">
                    Action
                </td>
                <td class="text-right">
                    {{ buttonText }}
                </td>
            </tr>
        </tbody>
    </table>
    <p class="mb-1 font-weight-bold small">
        {{ t('operations.general.content') }}
    </p>
    <div
        v-if="!!visualizedParams"
        class="text-left custom-content"
        v-html="visualizedParams"
    />
    <pre
        v-else-if="!!props.request.params"
        class="text-left custom-content"
    >
      <code>
        {
          {{ props.request.params }}
        }
      </code>
    </pre>
    {{ t('operations.rawsig.request_cta') }}
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
</template>
