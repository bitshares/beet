<script setup>
    import { ipcRenderer } from 'electron';
    import { ref, computed } from 'vue';
    import router from '../router/index.js';
    import store from '../store/index';
    import langSelect from "./lang-select.vue";

    let open = ref(false);

    let items = computed(() => {
        return [
            {
                text: t("common.actionBar.Home"),
                url: "/dashboard"
            },
            {
                text: t("common.actionBar.New"),
                url: "/add-account"
            },
            {
                text: t("common.actionBar.TOTP"),
                url: "/totp"
            },
            {
                text: t("common.actionBar.QR"),
                url: "/qr"
            },
            {
                text: t("common.actionBar.Settings"),
                url: "/settings"
            },
            {
                text: t("common.actionBar.Logout"),
                url: "/"
            }
        ]
    });

    function onChange(data) {
        console.log(data.index)
        if (data.index === 5) {
            console.log('logout')
            store.dispatch("WalletStore/logout");
            router.replace("/");
        }

        router.replace(items.value[data.index].url);
    }

    ipcRenderer.on('timeout', async (event, args) => {
        console.log('wallet timed logout')
        store.dispatch("WalletStore/logout");
        router.replace("/");
    })
</script>

<template>
    <div>
        <ui-menu-anchor absolute position="TOP_RIGHT">
            <ui-fab style="margin-bottom: 10px;" icon="menu" @click="open = true" mini></ui-fab>
            <langSelect location="small" />

            <ui-menu
                v-model="open"
                :items="items"
                position="TOP_RIGHT"
                @selected="onChange"
            />
        </ui-menu-anchor>
    </div>

</template>
