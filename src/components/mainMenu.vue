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
                icon: "home",
                url: "/dashboard"
            },
            {
                text: t("common.actionBar.New"),
                icon: "add",
                url: "/add-account"
            },
            {
                text: t("common.actionBar.TOTP"),
                icon: "generating_tokens",
                url: "/totp"
            },
            {
                text: t("common.actionBar.QR"),
                icon: "qr_code_2",
                url: "/qr"
            },
            {
                text: t("common.actionBar.Settings"),
                icon: "settings",
                url: "/settings"
            },
            {
                text: t("common.actionBar.Logout"),
                icon: "logout",
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

    function onSelected(data) {
        console.log({data})
    }

    ipcRenderer.on('timeout', async (event, args) => {
        console.log('wallet timed logout')
        store.dispatch("WalletStore/logout");
        router.replace("/");
    })
</script>

<template>
    <div>
        <ui-menu-anchor absolute position="BOTTOM_START">
            <ui-fab style="margin-bottom: 10px;" icon="menu" @click="open = true" mini></ui-fab>
            <langSelect location="small" />

            <ui-menu
                style="border: 1px solid #C7088E;"
                position="BOTTOM_START"
                v-model="open"
                @selected="onChange"
                @cancel="onCancel"
            >
                <ui-menuitem nested>
                    <ui-menuitem v-for="item in items" :key="item.icon">
                        <ui-menuitem-icon>
                            <ui-icon style="color: #707070;">{{item.icon}}</ui-icon>
                        </ui-menuitem-icon>
                        <ui-menuitem-text>{{item.text}}</ui-menuitem-text>
                    </ui-menuitem>
                </ui-menuitem>
            </ui-menu>
        </ui-menu-anchor>
    </div>
</template>
