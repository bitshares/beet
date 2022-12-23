<script setup>
    import { computed, inject, onMounted, watchEffect, ref } from "vue";
    import getBlockchainAPI from "../lib/blockchains/blockchainFactory";

    import Balances from "./balances";
    import AccountDetails from "./account-details";
    import AccountSelect from "./account-select";

    import store from '../store/index';

    const emitter = inject('emitter');

    let selectedAccount = computed(() => {
        if (!store.state.WalletStore.isUnlocked) {
            return;
        }
        return store.getters["AccountStore/getCurrentSafeAccount"]()
    })

    let lastBlockchain = ref(null);
    let blockchain = ref();
    watchEffect(() => {
        if (selectedAccount.value) {
            if (!lastBlockchain.value) {
                console.log("new account selected")
                lastBlockchain.value = selectedAccount.value.chain;
                blockchain.value = getBlockchainAPI(selectedAccount.value.chain);
            } else {
                if (lastBlockchain.value !== selectedAccount.value.chain) {
                    console.log("account with different blockchain selected")
                    lastBlockchain.value = selectedAccount.value.chain;
                    blockchain.value = null;
                    blockchain.value = getBlockchainAPI(selectedAccount.value.chain);
                } else {
                    console.log("account with same blockchain selected")
                }
            }
        }
    })

    /**
     * Set the initial menu value
     */
    onMounted(() => {
        emitter.emit('setMenuItem', 0);
    });
</script>

<template>
    <span
        class="container"
        style="min-height:700px;"
    >
        <AccountSelect />
        <span v-if="selectedAccount">
            <AccountDetails
                :account="selectedAccount"
                :blockchain="blockchain"
            />
            <Balances
                :account="selectedAccount"
                :blockchain="blockchain"
            />
        </span>
    </span>
</template>
