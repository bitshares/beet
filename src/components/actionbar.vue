<script setup>
    import { onMounted, inject, ref, watchEffect, computed } from "vue";
    import { useI18n } from 'vue-i18n';
    import router from '../router/index.js';
    import store from '../store/index';
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();
    const emitter = inject('emitter');
    const { t } = useI18n({ useScope: 'global' });

    let active = ref(0);

    let items = computed(() => {
        return [
            {
                text: t("common.abHome"),
                url: "/dashboard"
            },
            {
                text: t("common.abNew"),
                url: "/add-account"
            },
            {
                text: t("common.abSettings"),
                url: "/settings"
            },
            {
                text: t("common.abLogout"),
                url: "/"
            }
        ]
    });

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
