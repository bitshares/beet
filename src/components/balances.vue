<script setup>
    import { watch, watchEffect, ref, computed, onMounted, inject } from "vue";
    const emitter = inject('emitter');
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import getBlockchainAPI from "../lib/blockchains/blockchainFactory";
    import store from '../store/index';

    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    async function fetchBalances(chain, name) {
      let blockchain;
      try {
          blockchain = getBlockchainAPI(chain);
      } catch (error) {
          console.error(error);
          errored = true;
          return [];
      }

      let retrievedBalance;
      try {
          retrievedBalance = await blockchain.getBalances(name);
      } catch (error) {
          console.error(error);
          errored = true;
          return [];
      }

      return retrievedBalance;
    }

    const props = defineProps({
      account: Object
    });

    let errored = ref(false);
    let balances = ref([]);

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
      balances.value = await fetchBalances(
        selectedChain.value,
        accountName.value
      );
    });

    onMounted(async () => {
      logger.debug("Balances Table Mounted");
    });

    async function loadBalances() {
        try {
          await store.dispatch("WalletStore/confirmUnlock");
        } catch (error) {
          console.log(error);
          balances.value = [];
        }

        if (selectedChain.value !== '' && accountName.value !== '') {
          balances.value = await fetchBalances(selectedChain.value, accountName.value)
        }
    }
</script>

<template>
    <div>
        <p class="mb-1 font-weight-bold small">
            {{ t('common.balances_lbl') }}
            <ui-button @click="loadBalances()" class="step_btn">
              Refresh balance
            </ui-button>
        </p>
        <span v-if="errored">
            {{ t('common.balances_error') }}
        </span>
        <ui-card elevated class="wideCard" v-if="balances != null">
            <ui-list>
                <ui-item
                  v-for="balance in balances"
                  :key="balance.id"
                >
                    <ui-item-text-content>
                        <ui-item-text1>
                            {{ balance.balance }} {{ balance.prefix }} {{ balance.asset_name }}
                        </ui-item-text1>
                    </ui-item-text-content>
                </ui-item>
                <ui-item v-if="balances.length == 0">
                  <ui-item-text-content>
                      <ui-item-text1>
                        No balances
                      </ui-item-text1>
                      <ui-item-text2>
                        -
                      </ui-item-text2>
                  </ui-item-text-content>
                </ui-item>
            </ui-list>
        </ui-card>
    </div>
</template>
