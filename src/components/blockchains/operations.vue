<script setup>
    import { onMounted, watchEffect, ref, computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    import store from '../store/index';
    import getBlockchainAPI from "../lib/blockchains/blockchainFactory";

    const { t } = useI18n({ useScope: 'global' });

    function saveRows() {
        if (selectedRows && selectedRows.value) {
            // save rows to account
            let chain = store.getters['AccountStore/getChain'];
            store.dispatch(
                "SettingsStore/setChainTOTP",
                {
                    chain: chain,
                    rows: selectedRows.value
                }
            );
            selectedRows.value = JSON.parse(JSON.stringify(settingsRows.value))
        }
    }

    let thead = ref(['ID', 'Method', 'Info'])

    let tbody = ref([
        {
          field: 'id',
          fn: data => {
            return data.id
          }
        },
        {
          field: 'method',
          fn: data => {
            return t(`operations.injected.BTS.${data.method}.method`)
          }
        },
        {
          field: 'info',
          fn: data => {
            return t(`operations.injected.BTS.${data.method}.tooltip`)
          }
        }
    ]);

    let data = computed(() => {
        // get operations
        let chain = store.getters['AccountStore/getChain'];
        let types = getBlockchainAPI(chain).getOperationTypes();
        return types;
    });

    let settingsRows = computed(() => {
        // last approved TOTP rows for this chain
        let chain = store.getters['AccountStore/getChain']
        let rememberedRows = store.getters['SettingsStore/getChainTOTP'](chain);
        if (!rememberedRows || !rememberedRows.length) {
            return [];
        }

        return rememberedRows;
    });

    let hasSelectedNewRows = ref(false);
    let selectedRows = ref([]);
    onMounted(() => {
        selectedRows.value = settingsRows && settingsRows.value
                                ? JSON.parse(JSON.stringify(settingsRows.value))
                                : []
    })

    watchEffect(() => {
        if (selectedRows && settingsRows) {
            if (
                selectedRows.value && selectedRows.value.sort().join('') === settingsRows.value.sort().join('')
            ) {
                // initial setting of settingsrows
                hasSelectedNewRows.value = false;
            } else if (selectedRows.value && selectedRows.value.sort().join('') !== settingsRows.value.sort().join('')) {
                console.log('Selected a new row')
                hasSelectedNewRows.value = true;
            }
        } else {
            hasSelectedNewRows.value = false;
        }
    });
</script>

<template>
    <div class="bottom p-0">
        <span>
            <span>
                <p style="marginBottom:0px;">
                    {{ t('common.totp.label') }}<br/>
                    {{ t('common.totp.prompt') }}
                </p>
                <ui-card v-if="!data || !data.length" outlined style="marginTop: 5px;">
                    {{ t('common.totp.unsupported') }}
                </ui-card>
                <ui-card v-else outlined style="marginTop: 5px;">
                    <ui-table
                        v-model="selectedRows"
                        :data="data"
                        :thead="thead"
                        :tbody="tbody"
                        :default-col-width="200"
                        style="height: 250px;"
                        row-checkbox
                        selected-key="id"
                    >
                        <template #method="{ data }">
                            <div class="method">{{ data.method }}</div>
                        </template>

                        <template #info="{ data }">
                            <div class="info">{{ data.info }}</div>
                        </template>
                    </ui-table>
                    <ui-list>
                        <ui-item>
                            <ui-button raised style="margin-right:5px" icon="save" @click="saveRows">
                                {{ t('common.qr.back') }}
                            </ui-button>
                            <ui-button raised style="margin-right:5px" icon="save" @click="saveRows">
                                {{ t('common.totp.save') }}
                            </ui-button>
                        </ui-item>
                    </ui-list>
                </ui-card>
            </span>
        </span>
    </div>
</template>
