<script setup>
    import { computed, onMounted, ref, watchEffect } from "vue";

    import queryString from "query-string";
    import { useI18n } from 'vue-i18n';
    import getBlockchainAPI from "../lib/blockchains/blockchainFactory";

    import * as Actions from '../lib/Actions';

    import langSelect from "./lang-select.vue";

    const { t } = useI18n({ useScope: 'global' });

    function handleProp(target) {
        if (!global || !global.location || !global.location.search) {
            return '';
        }

        let qs;
        try {
            qs = queryString.parse(global.location.search);
        } catch (error) {
            console.log(error);
            return;
        }

        if (!qs[target]) {
            return;
        }

        let qsTarget = qs[target];
        let decoded = decodeURIComponent(qsTarget);
        return decoded;
    }

    let request = computed(() => {
        let req = handleProp('request');
        return req ? JSON.parse(req) : null;
    });

    let moreRequest = computed(() => {
        let req = handleProp('request');
        return req ? JSON.stringify(JSON.parse(req), undefined, 4) : null;
    });

    let result = computed(() => {
        let res = handleProp('result');
        return res ? JSON.parse(res) : null;
    });

    let moreResult = computed(() => {
        let res = handleProp('result');
        return res ? JSON.stringify(JSON.parse(res), undefined, 4) : null;
    });

    let notifyTXT = computed(() => {
        let res = handleProp('notifyTXT');
        return res ?? null;
    });

    let visualizedParams = computed(() => {
        let params = handleProp('visualizedParams');
        return params ? JSON.parse(params) : {};
    });

    let total = ref(visualizedParams.value.length);
    let openOPReq = ref(false);
    let openOPRes = ref(false);
    let openOpDetails = ref(false);
    let page = ref(1);

    let jsonData = ref("");
    let resultData = ref("");
    let resultID = ref("");
    let resultBlockNum = ref(1);
    let resultTrxNum = ref(1);
    let resultExpiration = ref("");
    let resultSignatures = ref("");
    watchEffect(() => {
        jsonData.value = JSON.stringify(
            visualizedParams.value[page.value - 1].op, undefined, 4
        );
        resultData.value = JSON.stringify(
            result.value[0].trx.operation_results[page.value - 1], undefined, 4
        );
        resultID.value = result.value[page.value - 1].id;
        resultBlockNum.value = result.value[page.value - 1].block_num;
        resultTrxNum.value = result.value[page.value - 1].trx_num;
        resultExpiration.value = result.value[page.value - 1].trx.expiration;
        resultSignatures.value = result.value[page.value - 1].trx.signatures;
    });

    let openMoreRequest = ref(false);
    let openResult = ref(false);
</script>

<template>
    <div style="overflow-y: auto; width: 750px;">
        <ui-collapse
            with-icon
            ripple
            model-value="{{True}}"
        >
            <template #toggle>
                <div>{{ t('common.popup.evaluate') }}</div>
            </template>
            <div style="overflow-y: auto; padding-right: 25px; padding-left: 5px; padding-bottom: 15px;">
                <div>
                    {{ notifyTXT }}
                </div>

                <div
                    v-if="!!visualizedParams"
                    class="text-left custom-content"
                    style="marginTop: 10px;"
                >
                    <ui-card no-hover>
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
                                <div style="margin-bottom: 5px;">
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
                                    @click="openOPReq = true"
                                >
                                    {{ t('common.popup.request') }}
                                </ui-button>
                                <ui-button
                                    outlined
                                    style="margin-left: 25px;"
                                    @click="openOPRes = true"
                                >
                                    {{ t('common.popup.result') }}
                                </ui-button>
                                <ui-button
                                    outlined
                                    style="margin-left: 25px;"
                                    @click="openOpDetails = true"
                                >
                                    {{ t('common.popup.details') }}
                                </ui-button>
                            </ui-card-buttons>
                            <ui-card-icons />
                        </ui-card-actions>
                    </ui-card>
                    <ui-pagination
                        v-if="total > 1"
                        v-model="page"
                        :total="total"
                        mini
                        show-total
                        :page-size="[1]"
                        position="center"
                    />
                </div>
            </div>
        </ui-collapse>
        <ui-collapse
            v-if="result"
            with-icon
            ripple
        >
            <template #toggle>
                <div>{{ t('common.popup.result') }}</div>
            </template>
            <div>
                <ui-button
                    outlined
                    @click="openResult = true"
                >
                    {{ t('common.popup.result') }}
                </ui-button>
            </div>
        </ui-collapse>
        <ui-collapse
            v-if="moreRequest"
            with-icon
            ripple
        >
            <template #toggle>
                <div>{{ t('common.popup.request') }}</div>
            </template>
            <div>
                <ui-button
                    outlined
                    @click="openMoreRequest = true"
                >
                    {{ t('common.popup.request') }}
                </ui-button>
            </div>
        </ui-collapse>
        <ui-collapse
            with-icon
            ripple
        >
            <template #toggle>
                <div>{{ t('common.abSettings') }}</div>
            </template>
            <langSelect location="prompt" />
        </ui-collapse>
    </div>

    <ui-dialog
        v-model="openOPReq"
        fullscreen
    >
        <ui-dialog-title v-if="total > 1">
            {{ t("common.popup.keywords.request") }} ({{ page }}/{{ total }})
        </ui-dialog-title>
        <ui-dialog-title v-else>
            {{ t("common.popup.keywords.request") }}
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

    <ui-dialog
        v-model="openOPRes"
        fullscreen
    >
        <ui-dialog-title v-if="total > 1">
            {{ t("common.popup.keywords.result") }} ({{ page }}/{{ total }})
        </ui-dialog-title>
        <ui-dialog-title v-else>
            {{ t("common.popup.keywords.result") }}
        </ui-dialog-title>
        <ui-dialog-content>
            <ui-textfield
                v-model="resultData"
                input-type="textarea"
                fullwidth
                disabled
                rows="8"
            />
        </ui-dialog-content>
    </ui-dialog>

    <ui-dialog
        v-model="openOpDetails"
        fullscreen
    >
        <ui-dialog-title>
            {{ t('common.popup.details') }}
        </ui-dialog-title>
        <ui-dialog-content>
            {{ t('operations.receipt.id', {resultID}) }}<br>
            {{ t('operations.receipt.block', {resultBlockNum}) }}<br>
            {{ t('operations.receipt.trxNum', {resultTrxNum}) }}<br>
            {{ t('operations.receipt.expiration', {resultExpiration}) }}<br>
            {{ t('operations.receipt.signatures', {resultSignatures}) }}
        </ui-dialog-content>
    </ui-dialog>

    <ui-dialog
        v-model="openResult"
        fullscreen
    >
        <ui-dialog-title>
            {{ t('common.popup.result') }}
        </ui-dialog-title>
        <ui-dialog-content>
            <ui-textfield
                v-model="moreResult"
                input-type="textarea"
                fullwidth
                disabled
                rows="8"
            />
        </ui-dialog-content>
    </ui-dialog>

    <ui-dialog
        v-model="openMoreRequest"
        fullscreen
    >
        <ui-dialog-title>
            {{ t('common.popup.request') }}
        </ui-dialog-title>
        <ui-dialog-content>
            <ui-textfield
                v-model="moreRequest"
                input-type="textarea"
                fullwidth
                disabled
                rows="8"
            />
        </ui-dialog-content>
    </ui-dialog>
</template>
