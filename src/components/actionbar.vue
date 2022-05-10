<script setup>
    import { onMounted, inject, ref, watchEffect, computed } from "vue";
    import { useRoute } from 'vue-router'
    //import { useRouter, useRoute } from 'vue-router'
    import router from '../router/index.js';
    import store from '../store/index';

    const emitter = inject('emitter');

    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    const props = defineProps({
        tab: {
            type: Number,
            required: false,
            default() {
                return 0
            }
        }
    });

    function logout() {
        console.log('logout')
        store.dispatch("WalletStore/logout");
        router.replace("/");
    }

    emitter.on('timeout', (data)=>{
        if (data == 'logout') {
            logout();
        }
    })

    let active = ref(props.tab.value ?? null);

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

    let currentURL = computed(() => {
        const location = useRoute();
        return location.path;
    });

    watchEffect(() => {
        if (active.value === 3) {
            logout();
        }

        let targetURL = items.value[active.value].url;

        if (currentURL.value !== targetURL) {
            router.replace(targetURL);
        }
    });
/*
<ui-navigation-bar content-selector=".actionbarContainer" v-model="active">
  <ui-tabs
      v-model="active"
      type="text"
      :items="items"
  />
</ui-navigation-bar>
*/
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
