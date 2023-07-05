<script setup>
    import { ipcRenderer } from 'electron';
    import { computed, onMounted, ref, watchEffect } from "vue";
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

    let jsonData = ref("");
    let page = ref(1);
    watchEffect(() => {
        jsonData.value = JSON.stringify(visualizedParams.value[page.value - 1].op, undefined, 4)
    });

    let total = ref(visualizedParams.value.length);
    let open = ref(false);
</script>
<template>
    <div style="padding-bottom:5px;">
        {{ tableTooltip }}
    </div>
    <div>
        {{ 
            visualizedParams && visualizedParams.length > 1
                ? t('operations.rawsig.summary', {numOps: visualizedParams.length})
                : t('operations.rawsig.summary_single')
        }}
    </div>
    <div
        v-if="!!visualizedParams"
        class="text-left custom-content"
        style="marginTop: 10px;"
    >
        <ui-card>
            <ui-card-content>
                <ui-card-text>
                    <div
                        v-if="total > 1"
                        :class="$tt('subtitle1')"
                    >
                        {{ t(visualizedParams[page - 1].title) }} ({{ page }}/{{ total }})
                    </div>
                    <div
                        v-else
                        :class="$tt('subtitle1')"
                    >
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
            <ui-card-actions>
                <ui-card-buttons>
                    <ui-button
                        outlined
                        @click="open = true"
                    >
                        {{ t('common.popup.request') }}
                    </ui-button>
                </ui-card-buttons>
                <ui-card-icons />
            </ui-card-actions>
        </ui-card>
        <ui-pagination
            v-model="page"
            :total="total"
            mini
            show-total
            :page-size="[1]"
            position="center"
        />
        <h4 class="h4 beet-typo-small">
            {{ t('operations.rawsig.request_cta') }}
        </h4>

        <ui-button-group
            v-if="!!visualizedParams"
            style="padding-bottom: 25px;"
        >
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
        </ui-button-group>
        <ui-button-group
            v-else
            style="padding-bottom: 25px;"
        >
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
        </ui-button-group>
    </div>
    <div
        v-else
        class="text-left custom-content"
    >
        <pre>
            {{ t('operations.rawsig.loading') }}
        </pre>
    </div>

    <ui-dialog
        v-model="open"
        fullscreen
    >
        <ui-dialog-title v-if="total > 1">
            {{ t(visualizedParams[page - 1].title) }} ({{ page }}/{{ total }})
        </ui-dialog-title>
        <ui-dialog-title v-else>
            {{ t(visualizedParams[page - 1].title) }}
        </ui-dialog-title>
        <ui-dialog-content>
            <ui-textfield
                v-model="jsonData"
                input-type="textarea"
                fullwidth
                disabled
                rows="8"
            />
        </ui-dialog-content>
    </ui-dialog>
</template>
