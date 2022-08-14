<script setup>
    const emitter = inject('emitter');
    import { onMounted, inject, ref, watchEffect, computed } from "vue";
    import router from '../router/index.js';
    import store from '../store/index';
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    let active = ref(0);
    let items = ref([
        {
            text: 'Home',
            url: "/dashboard"
        },
        {
            text: 'New',
            url: "/add-account"
        },
        {
            text: 'Settings',
            url: "/settings"
        },
        {
            text: 'Logout',
            url: "/"
        }
    ]);

    function logout() {
        console.log('logout')
        store.dispatch("WalletStore/logout");
        router.replace("/");
    }

    watchEffect(() => {
        if (!active.value) {
            return;
        }

        if (active.value === 3) {
            logout();
        }

        router.replace(items.value[active.value].url);
    });

    emitter.on('timeout', (data)=>{
        if (data == 'logout') {
            logout();
        }
    })
</script>

<template>
    <div
        key="actionbar"
        class="actionbarContainer"
    >
        <ui-tab-bar
            v-model="active"
            content-selector=".actionbarContainer"
        >
            <ui-tab
                v-for="(tab, index) in items"
                :key="index"
            >
                {{ tab.text }}
            </ui-tab>
        </ui-tab-bar>
    </div>
</template>
