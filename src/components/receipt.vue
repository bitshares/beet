<script setup>
    import { computed } from "vue";
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

    let notifyTXT = computed(() => {
        let res = handleProp('notifyTXT');
        return res ?? null;
    });

    let receipt = computed(() => {
        let res = handleProp('receipt');
        return res ? JSON.parse(res) : null;
    });
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
            <div style="overflow-y: auto; padding-right: 25px;">
                Testing
                {{ notifyTXT }}
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
                <ui-textfield
                    v-model="moreRequest"
                    input-type="textarea"
                    fullwidth
                    disabled
                    rows="8"
                />
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
                <ui-textfield
                    v-model="result"
                    input-type="textarea"
                    fullwidth
                    disabled
                    rows="8"
                />
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
</template>
