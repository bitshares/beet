<script setup>
    import { ipcRenderer } from 'electron';
    import { ref, computed, inject } from 'vue';
    import router from '../router/index.js';
    import store from '../store/index';
    import langSelect from "./lang-select.vue";
    const emitter = inject('emitter');

    let open = ref(false);
    let currentSelection = ref();

    emitter.on('setMenuItem', response => {
        currentSelection.value = response;
    });

    let items = computed(() => {
        return [
            {
                text: t("common.actionBar.Home"),
                index: 0,
                icon: "home",
                url: "/dashboard"
            },
            {
                text: t("common.actionBar.New"),
                index: 1,
                icon: "add",
                url: "/add-account"
            },
            {
                text: t("common.actionBar.TOTP"),
                index: 2,
                icon: "generating_tokens",
                url: "/totp"
            },
            {
                text: t("common.actionBar.QR"),
                index: 3,
                icon: "qr_code_2",
                url: "/qr"
            },
            {
                text: t("common.actionBar.Settings"),
                index: 4,
                icon: "settings",
                url: "/settings"
            },
            {
                text: t("common.actionBar.Logout"),
                index: 5,
                icon: "logout",
                url: "/"
            }
        ]
    });

    function onChange(data) {
        currentSelection.value = data.index;

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
        <ui-menu-anchor absolute position="BOTTOM_START">
            <ui-fab style="margin-bottom: 10px;" icon="menu" @click="open = true" mini></ui-fab>
            <langSelect location="small" />

            <ui-menu
                style="border: 1px solid #C7088E;"
                position="BOTTOM_START"
                v-model="open"
                @selected="onChange"
            >
                <ui-menuitem nested v-for="item in items" :key="item.icon">
                    <ui-menuitem v-if="currentSelection === item.index" selected>
                        <ui-menuitem-icon>
                            <ui-icon style="color: #707070;">{{item.icon}}</ui-icon>
                        </ui-menuitem-icon>
                        <ui-menuitem-text>{{item.text}}</ui-menuitem-text>
                    </ui-menuitem>
                    <ui-menuitem v-else>
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
