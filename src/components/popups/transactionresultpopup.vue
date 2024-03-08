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
        result: {
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

    let total = ref(visualizedParams.value.length);
    let open = ref(false);
    let page = ref(1);
    let receipt = ref(false);

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
        logger.debug("Transaction result popup initialised");
    });

    let jsonData = ref("");
    watchEffect(() => {
        jsonData.value = JSON.stringify(visualizedParams.value[page.value - 1].op, undefined, 4)
    });
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
        style="margin-top: 10px;"
    >
        <ui-card>
            <ui-card-content>
                <ui-card-text>
                    <div
                        v-if="total > 1"
                        :class="$tt('subtitle1')"
                    >
                        <b>{{ t(visualizedParams[page - 1].title) }}</b> ({{ page }}/{{ total }})
                    </div>
                    <div
                        v-else
                        :class="$tt('subtitle1')"
                    >
                        <b>{{ t(visualizedParams[page - 1].title) }}</b>
                    </div>
                    <div>
                        {{ t(`operations.injected.BTS.${visualizedParams[page - 1].method}.headers.result`) }}
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
            {{ t('operations.rawsig.receipt.title') }}
        </h4>
        <ui-switch
            v-model="receipt"
            input-id="enable-receipt"
            style="margin-bottom: 5px;"
        />
        <label
            :for="'enable-receipt'"
            style="margin-left: 15px;"
        >
            {{ t(`operations.rawsig.receipt.${receipt ? "yes" : "no"}`) }}
        </label>

        <h4 class="h4 beet-typo-small">
            {{ t('operations.rawsig.request_cta') }}
        </h4>
        <div
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
        </div>
        <div
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
        </div>
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
