<script setup>
    import { ipcRenderer } from 'electron';
    import { ref, computed, inject } from 'vue';
    import { useI18n } from 'vue-i18n';

    import router from '../router/index.js';
    import store from '../store/index';
    import langSelect from "./lang-select.vue";
    const emitter = inject('emitter');

    let open = ref(false);
    let currentSelection = ref();
    const { t } = useI18n({ useScope: 'global' });

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
                text: t("common.actionBar.Local"),
                index: 3,
                icon: "upload",
                url: "/local"
            },
            {
                text: t("common.actionBar.RAW"),
                index: 4,
                icon: "raw_on",
                url: "/raw-link"
            },
            {
                text: t("common.actionBar.QR"),
                index: 5,
                icon: "qr_code_2",
                url: "/qr"
            },
            {
                text: t("common.actionBar.dapps"),
                index: 6,
                icon: "app_registration",
                url: "/dapps"
            },
            {
                text: t("common.actionBar.Backup"),
                index: 7,
                icon: "download",
                url: "/backup"
            },
            {
                text: t("common.actionBar.Logout"),
                index: 8,
                icon: "logout",
                url: "/"
            }
        ]
    });

    function onChange(data) {
        currentSelection.value = data.index;

        if (data.index === 8) {
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
        <ui-menu-anchor
            absolute
            position="BOTTOM_START"
        >
            <ui-fab
                style="margin-bottom: 10px;"
                icon="menu"
                mini
                @click="open = true"
            />
            <langSelect location="small" />

            <ui-menu
                v-model="open"
                style="border: 1px solid #C7088E;"
                position="BOTTOM_START"
                @selected="onChange"
            >
                <ui-menuitem
                    v-for="item in items"
                    :key="item.icon"
                    nested
                >
                    <ui-menuitem
                        v-if="currentSelection === item.index"
                        selected
                    >
                        <ui-menuitem-icon dark>
                            <ui-icon style="color: #707070;">
                                {{ item.icon }}
                            </ui-icon>
                        </ui-menuitem-icon>
                        <ui-menuitem-text>{{ item.text }}</ui-menuitem-text>
                    </ui-menuitem>
                    <ui-menuitem v-else>
                        <ui-menuitem-icon dark>
                            <ui-icon
                                dark
                                style="visibility: visible;"
                            >
                                {{ item.icon }}
                            </ui-icon>
                        </ui-menuitem-icon>
                        <ui-menuitem-text>{{ item.text }}</ui-menuitem-text>
                    </ui-menuitem>
                </ui-menuitem>
            </ui-menu>
        </ui-menu-anchor>
    </div>
</template>
