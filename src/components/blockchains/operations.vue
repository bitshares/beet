<script setup>
    import { onMounted, watchEffect, ref, computed, inject } from 'vue';
    import { useI18n } from 'vue-i18n';
    import store from '../../store/index';
    import getBlockchainAPI from "../../lib/blockchains/blockchainFactory";

    const { t } = useI18n({ useScope: 'global' });
    const emitter = inject('emitter');

    function saveRows() {
        if (selectedRows && selectedRows.value) {
            // save rows to account
            let chain = store.getters['AccountStore/getChain'];
            store.dispatch(
                "SettingsStore/setChainPermissions",
                {
                    chain: chain,
                    rows: selectedRows.value
                }
            );
            selectedRows.value = JSON.parse(JSON.stringify(settingsRows.value))
            emitter.emit('selectedRows', true);
        }
    }

    function goBack() {
        emitter.emit('exitOperations', true);
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
        let rememberedRows = store.getters['SettingsStore/getChainPermissions'](chain);
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
                    {{ t('common.totp.prompt') }}
                </p>
                <p
                    v-if="!data || !data.length"
                    outlined
                    style="marginTop: 5px;"
                >
                    {{ t('common.totp.unsupported') }}
                </p>
                <ui-table
                    v-else 
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
                    <ui-item style="padding-left:100px;">
                        <ui-button
                            raised
                            style="margin-right:5px"
                            icon="arrow_back_ios"
                            @click="goBack"
                        >
                            {{ t('common.qr.back') }}
                        </ui-button>
                        <ui-button
                            v-if="selectedRows && selectedRows.length"
                            raised
                            style="margin-right:5px"
                            icon="save"
                            @click="saveRows"
                        >
                            {{ t('common.totp.save') }}
                        </ui-button>
                        <ui-button
                            v-else
                            raised
                            style="margin-right:5px"
                            icon="save"
                            disabled
                        >
                            {{ t('common.totp.save') }}
                        </ui-button>
                    </ui-item>
                </ui-list>
            </span>
        </span>
    </div>
</template>
