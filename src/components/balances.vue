<script setup>
    import { watch, watchEffect, ref, computed, onMounted, inject } from "vue";
    import { useI18n } from 'vue-i18n';
    import getBlockchainAPI from "../lib/blockchains/blockchainFactory";
    import store from '../store/index';
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
                //console.log(result)
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
            Refresh
        </ui-button>
        <ui-button
            v-else-if="!isConnected && !isConnecting"
            class="step_btn"
            @click="loadBalances()"
        >
            Reconnect
        </ui-button>

        <ui-table
            v-if="tableData"
            :data="tableData.data"
            :thead="tableData.thead"
            :tbody="tableData.tbody"
            style="height: 180px; overflow-y: scroll;"
        />
        <ui-card
            v-if="balances && !balances.length"
            outlined
        >
            No balances in account
        </ui-card>
        <ui-card
            v-if="isConnecting"
            outlined
            style="padding:5px; text-align: center;"
        >
            <figure>
                <ui-progress indeterminate></ui-progress>
                <br/>
                <figcaption>Connecting to blockchain</figcaption>
            </figure>
        </ui-card>
        <ui-card
            v-if="!isConnected && !isConnecting"
            outlined
            style="padding:5px"
        >
            Couldn't to connect to blockchain
        </ui-card>
    </div>
</template>
