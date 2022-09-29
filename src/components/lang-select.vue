<script setup>
    import { ref, onMounted, computed, inject } from 'vue';
    import { locales, defaultLocale, selectLocales, menuLocales } from "../config/i18n.js";
    import RendererLogger from "../lib/RendererLogger";
    import store from '../store/index';
    const emitter = inject('emitter');
    const logger = new RendererLogger();

    const props = defineProps({
        location: {
            type: String,
            required: true,
            default() {
                return 'guest'
            }
        }
    });


    let localesRef = computed(() => {
        return menuLocales;
    });

    let location = computed(() => {
        return props.location;
    });

    let selected = ref(
        store.state.SettingsStore.settings.locale.iso ?? defaultLocale.iso
    );

    let open = ref(false);

    onMounted(() => {
        logger.debug("Language Selector mounted");
    });

    function menuClick() {
        open.value = true;
    }

    function onCancel() {
        open.value = false;
    }

    function onSelected(locale) {       
        emitter.emit('i18n', locale.value);
        store.dispatch("SettingsStore/setLocale", {locale: locale.value});
        selected.value = locale.value;
        open.value = false;
    }
</script>


<template>
    <ui-menu-anchor absolute position="TOP_RIGHT">
        <ui-button
            outlined
            position="TOP_RIGHT"
            @click="menuClick"
        >
            {{ selected }}
        </ui-button>
        <router-link
            v-if="location == 'small'"
            :to="'/totp'"
            replace
        >
            <ui-button
                outlined
                position="TOP_RIGHT"
            >
                TOTP
            </ui-button>
        </router-link>
        <ui-menu
            v-model="open"
            position="TOP_RIGHT"
            :items="localesRef"
            @selected="onSelected"
            @cancel="onCancel"
        />
    </ui-menu-anchor>
</template>
