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

    let token = ref(0);
    let assetText = ref('');

    /**
     * Fetch blockchain account balances
     * @returns {Array}
     */
    async function fetchBalances(chain, name) {
        isConnecting.value = true;
        return getBlockchainAPI(chain).getBalances(name)
            .then(result => {
                console.log(result);
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

    /**
     * On demand load the balances
     */
    async function loadBalances() {
        if (selectedChain.value !== '' && accountName.value !== '') {
            balances.value = await fetchBalances(selectedChain.value, accountName.value)
        }
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

    watchEffect(async () => {
        if (selectedChain.value !== '' && accountName.value !== '') {
            balances.value = await fetchBalances(selectedChain.value, accountName.value)
        }
    });

    watchEffect(() => {
        assetText.value = balances.value && balances.value.length
            ? `${balances.value[token.value].balance} ${balances.value[token.value].prefix} ${balances.value[token.value].asset_name}`
            : `???`;
    }
    );
</script>

<template>
    <div>
        <p class="mb-1 font-weight-bold small">
            {{ t('common.balances_lbl') }}
        </p>
        <ui-card
            elevated
            class="wideCard"
        >
            <ui-list>
                <ui-item
                    v-if="balances && balances.length > 0"
                    :key="balances[token]"
                >
                    <ui-item-text-content>
                        <ui-item-text1>
                            {{ assetText }}
                        </ui-item-text1>
                    </ui-item-text-content>
                    <ui-card-actions v-if="balances.length > 1">
                        <ui-pagination
                            v-model="token"
                            :total="balances.length"
                            show-total
                            mini
                        />
                    </ui-card-actions>
                </ui-item>
                <ui-item v-else-if="balances && !balances.length">
                    <ui-item-text-content>
                        <ui-item-text1>
                            No balances in account
                        </ui-item-text1>
                    </ui-item-text-content>
                </ui-item>
                <ui-item v-else-if="isConnecting || !balances">
                    <ui-item-text-content>
                        <ui-item-text1>
                            Connecting to blockchain
                        </ui-item-text1>
                    </ui-item-text-content>
                </ui-item>
                <ui-item v-else>
                    <ui-item-text-content>
                        <ui-item-text1>
                            {{ t('common.balances_error') }}
                        </ui-item-text1>
                    </ui-item-text-content>
                </ui-item>
                <ui-button
                    v-if="isConnected || balances"
                    class="step_btn"
                    @click="loadBalances()"
                >
                    Refresh balances
                </ui-button>
                <ui-button
                    v-else-if="!isConnected && !isConnecting"
                    class="step_btn"
                    @click="loadBalances()"
                >
                    Reconnect
                </ui-button>
            </ui-list>
        </ui-card>
    </div>
</template>
