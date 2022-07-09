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

    function incrementPagination(balances) {
        if (token.value + 1 > balances.length - 1) {
            token.value = 0;
        } else {
            token.value += 1;
        }
    }

    function decreasePagination(balances) {
        if (token.value - 1 < 0) {
            token.value = balances.length -1;
        } else {
            token.value -= 1;
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
    <div style="padding:5px">
        <group>
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
        </group>

        <ui-card outlined>
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
                        <ui-item-text1 style="padding:5px">
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
            </ui-list>
            <group v-if="balances && balances.length > 1" style="text-align: center;">
                <ui-button
                    v-if="isConnected || balances"
                    class="step_btn"
                    @click="decreasePagination(balances)"
                >
                    <i class="material-icons">chevron_left</i>
                </ui-button>
                {{
                    `${token} of ${balances.length}`
                }}
                <ui-button
                    v-if="isConnected || balances"
                    class="step_btn"
                    @click="incrementPagination(balances)"
                >
                    <i class="material-icons">chevron_right</i>
                </ui-button>
            </group>
        </ui-card>
    </div>
</template>
