<script setup>
    import { computed, ref, watchEffect } from "vue";
    import queryString from "query-string";
    import { useI18n } from 'vue-i18n';
    import { ipcRenderer } from 'electron';

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

    const type = ref();
    const toSend = ref();
    const chain = ref();
    const accountName = ref();
    const target = ref();
    const warning = ref();
    const visualizedParams = ref();
    const request = ref();
    const moreRequest = ref();
    const result = ref();
    const moreResult = ref();
    const notifyTXT = ref();

    const payload = ref();
    const accounts = ref();
    const existingLinks = ref();

    watchEffect(() => {
        const id = handleProp('id');

        ipcRenderer.send(`get:receipt:${id}`);

        ipcRenderer.on(`respond:receipt:${id}`, (event, data) => {
            if (data.type) {
                type.value = data.type;
            }
            if (data.toSend) {
                toSend.value = data.toSend;
            }
            if (data.chain) {
                chain.value = data.chain;
            }
            if (data.accountName) {
                accountName.value = data.accountName;
            }
            if (data.target) {
                target.value = data.target;
            }
            if (data.warning) {
                warning.value = data.warning;
            }
            if (data.receipt) {
                visualizedParams.value = JSON.parse(data.receipt.visualizedParams);
            }
            if (data.request) {
                request.value = data.request;
                moreRequest.value = JSON.stringify(data.request, undefined, 4);
            }
            if (data.result) {
                result.value = data.result;
                moreResult.value = JSON.stringify(data.result, undefined, 4);
            }
            if (data.payload) {
                payload.value = JSON.parse(data.payload);
            }
            if (data.accounts && data.request) {
                const parsedAccounts = JSON.parse(data.accounts);
                const parsedRequest = JSON.parse(data.request);
                const filteredAccounts = parsedAccounts.filter(account => parsedRequest.payload.chain === account.chain);
                accounts.value = filteredAccounts;
            }
            if (data.existingLinks) {
                existingLinks.value = JSON.parse(data.existingLinks);
            }
            if (data.notifyTXT) {
                notifyTXT.value = data.notifyTXT;
            }
        });
    })

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
        const currentPageValue = page.value > 0 ? page.value - 1 : 0;

        if (visualizedParams.value && visualizedParams.value.length) {
            jsonData.value = JSON.stringify(
                visualizedParams.value[currentPageValue].op, undefined, 4
            );
        }

        if (result.value && result.value.length) {
            resultData.value = JSON.stringify(
                result.value[0].trx.operation_results[currentPageValue], undefined, 4
            );

            resultID.value = result.value[0].id;
            resultBlockNum.value = result.value[0].block_num;
            resultTrxNum.value = result.value[0].trx_num;
            resultExpiration.value = result.value[0].trx.expiration;
            resultSignatures.value = result.value[0].trx.signatures;
        }
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
                                    v-if="visualizedParams.length > 1"
                                    :class="$tt('subtitle1')"
                                >
                                    <b>{{ t(visualizedParams[page > 0 ? page - 1 : 0].title) }}</b> ({{ page }}/{{ visualizedParams.length }})
                                </div>
                                <div
                                    v-else
                                    :class="$tt('subtitle1')"
                                >
                                    <b>{{ t(visualizedParams[page > 0 ? page - 1 : 0].title) }}</b>
                                </div>
                                <div style="margin-bottom: 5px;">
                                    {{ t(`operations.injected.BTS.${visualizedParams[page > 0 ? page - 1 : 0].method}.headers.result`) }}
                                </div>
                                <div
                                    v-for="row in visualizedParams[page > 0 ? page - 1 : 0].rows"
                                    :key="row.key"
                                    :class="$tt('subtitle2')"
                                >
                                    {{ t(`operations.injected.BTS.${visualizedParams[page > 0 ? page - 1 : 0].method}.rows.${row.key}`, row.params) }}
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
                        v-if="visualizedParams.length > 1"
                        v-model="page"
                        :total="visualizedParams.length"
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
        <ui-dialog-title v-if="visualizedParams && visualizedParams.length > 1">
            {{ t("common.popup.keywords.request") }} ({{ page }}/{{ visualizedParams.length }})
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
        <ui-dialog-title v-if="visualizedParams && visualizedParams.length > 1">
            {{ t("common.popup.keywords.result") }} ({{ page }}/{{ visualizedParams.length }})
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
