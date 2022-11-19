<script setup>
    import { watchEffect, ref, computed, inject } from "vue";
    import { useI18n } from 'vue-i18n';
    import getBlockchainAPI from "../lib/blockchains/blockchainFactory";
    import RendererLogger from "../lib/RendererLogger";

    const emitter = inject('emitter');
    const { t } = useI18n({ useScope: 'global' });
    const logger = new RendererLogger();

    const props = defineProps({
        account: {
            type: Object,
            required: true,
            default() {
                return {}
            }
        }
    });

    let balances = ref();
    let isConnected = ref();
    let isConnecting = ref();
    let tableData = ref();

    /**
     * Fetch blockchain account balances
     * @returns {Array}
     */
    async function fetchBalances(chain, name) {
        isConnecting.value = true;
        return getBlockchainAPI(chain).getBalances(name)
            .then(result => {
                isConnected.value = true;
                isConnecting.value = false;
                return result;
            })
            .catch(error => {
                console.log(error);
                isConnected.value = false;
                isConnecting.value = false;
            });
    }

    let selectedChain = computed(() => {
        return props.account.chain;
    });

    let accountName = computed(() => {
        return props.account.accountName;
    });

    let accountID = computed(() => {
        return props.account.accountID;
    });

    /**
     * On demand load the balances
     */
    async function loadBalances() {
        if (selectedChain.value !== '' && accountName.value !== '') {
            tableData.value = null;
            balances.value = await fetchBalances(selectedChain.value, accountName.value)
        }
    }

    watchEffect(async () => {
        if (
            selectedChain.value && selectedChain.value !== '' &&
            accountName.value && accountName.value !== ''
        ) {
            loadBalances();
        }
    });

    watchEffect(() => {
        if (balances.value && balances.value.length) {
            tableData.value = {
                data: balances.value.map(balance => {
                    return {
                        balance: balance.balance,
                        asset_name: balance.asset_name
                    }
                }),
                thead: ['Asset name', 'Balance'],
                tbody: ['asset_name', 'balance']
            };
        }
    });
</script>

<template>
    <div style="padding:5px">
        {{ t('common.balances_lbl') }}
        <ui-button
            v-if="isConnected || balances"
            class="step_btn"
            @click="loadBalances()"
        >
            {{ t('common.balances.refresh') }}
        </ui-button>
        <ui-button
            v-else-if="!isConnected && !isConnecting"
            class="step_btn"
            @click="loadBalances()"
        >
            {{ t('common.balances.reconnect') }}
        </ui-button>

        <ui-table
            v-if="tableData"
            v-shadow="1"
            :data="tableData.data"
            :thead="tableData.thead"
            :tbody="tableData.tbody"
            style="height: 150px;"
        />
        <ui-card
            v-if="balances && !balances.length"
            v-shadow="1"
            outlined
        >
            {{ t('common.balances.empty') }}
        </ui-card>
        <ui-card
            v-if="isConnecting"
            v-shadow="1"
            outlined
            style="padding:5px; text-align: center;"
        >
            <ui-skeleton active />
        </ui-card>
        <ui-card
            v-if="!isConnected && !isConnecting"
            v-shadow="1"
            outlined
            style="padding:5px"
        >
            {{ t('common.balances.error') }}
        </ui-card>
    </div>
</template>
