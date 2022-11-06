<script setup>
    import { computed, inject, onMounted } from "vue";
    import Balances from "./balances";
    import AccountDetails from "./account-details";
    import AccountSelect from "./account-select";

    import store from '../store/index';

    const emitter = inject('emitter');

    let selectedAccount = computed(() => {
        return store.getters["AccountStore/getCurrentSafeAccount"]()
    })

    /**
     * Set the initial menu value
     */
    onMounted(() => {
        emitter.emit('setMenuItem', 0);
    });
</script>

<template>
    <span class="container" style="min-height:700px;">
        <AccountSelect />
        <AccountDetails :account="selectedAccount" />
        <Balances :account="selectedAccount" />
    </span>
</template>
