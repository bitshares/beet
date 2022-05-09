<script setup>
    import { watch, watchEffect, ref, computed, onMounted, inject } from "vue";
    const emitter = inject('emitter');
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import getBlockchainAPI from "../lib/blockchains/blockchainFactory";
    import store from '../store/index';

    import RendererLogger from "../lib/RendererLogger";
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

    let balances = ref([]);
    let fetched = ref(false);
    let token = ref(0);
    let assetText = ref('');

    /**
     * Fetch blockchain account balances
     * @returns {Array}
     */
    async function fetchBalances(chain, name) {
        fetched.value = false;
        let blockchain;
        try {
            blockchain = await getBlockchainAPI(chain);
        } catch (error) {
            console.error(error);
            return;
        }

        let retrievedBalance;
        try {
            retrievedBalance = await blockchain.getBalances(name);
        } catch (error) {
            console.error(error);
        }

        return retrievedBalance;
    }

    /**
     * On demand load the balances
     */
    async function loadBalances() {
        if (selectedChain.value !== '' && accountName.value !== '') {
            balances.value = await fetchBalances(selectedChain.value, accountName.value)
            if (balances.value) {
                fetched.value = true;
            }
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
            //console.log(`watch effect: ${selectedChain.value} ${accountName.value}`)
            balances.value = await fetchBalances(selectedChain.value, accountName.value);
            if (balances.value) {
                fetched.value = true;
            }
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
                <ui-item v-else-if="fetched && !balances.length">
                    <ui-item-text-content>
                        <ui-item-text1>
                            No balances in account
                        </ui-item-text1>
                    </ui-item-text-content>
                </ui-item>
                <ui-item v-else-if="!fetched">
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
                    class="step_btn"
                    v-if="fetched || !balances"
                    @click="loadBalances()"
                >
                    Refresh
                </ui-button>
            </ui-list>
        </ui-card>
    </div>
</template>
