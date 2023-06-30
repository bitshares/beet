<script setup>
    import { ipcRenderer } from 'electron';
    import { computed, onMounted, ref } from "vue";
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
            return {};
        }
        return JSON.parse(props.visualizedParams);
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

    let page = ref(1);
    let total = ref(visualizedParams.value.length);
</script>
<template>
    <div style="padding-bottom:5px;">
        {{ tableTooltip }}
    </div>
    <div
        v-if="!!visualizedParams"
        class="text-left custom-content"
    >
        <ui-card>
            <ui-card-content>
                <ui-card-text>
                    <div :class="$tt('subtitle1')">
                        {{ t(visualizedParams[page - 1].title) }}
                    </div>
                    <div
                        v-for="row in visualizedParams[page - 1].rows"
                        :key="row.key"
                        :class="$tt('subtitle2')"
                    >
                        {{ t(`operations.injected.BTS.${visualizedParams[page - 1].method}.rows.${row.key}`, row.params) }}
                    </div>
                </ui-card-text>
            </ui-card-content>
        </ui-card>
        <ui-pagination
            v-model="page"
            :total="total"
            mini
            show-total
            :page-size="[1]"
            position="center"
        />
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
