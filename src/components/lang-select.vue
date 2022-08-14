<script setup>
    import { ref, onMounted, computed } from 'vue';
    import { locales, defaultLocale, selectLocales, menuLocales } from "../config/i18n.js";
    import RendererLogger from "../lib/RendererLogger";
    import store from '../store/index';

    const logger = new RendererLogger();

    let localesRef = computed(() => {
        return menuLocales;
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
        console.log(`selected: ${locale}`);
        store.dispatch("SettingsStore/setLocale", {locale: locale});
        selected.value = locale.value;
        open.value = false;
    }
</script>


<template>
    <ui-button
        raised
        @click="menuClick"
    >
        {{ selected }}
    </ui-button>
    <ui-menu
        v-model="open"
        :items="menuLocales"
        @selected="onSelected"
        @cancel="onCancel"
    />
</template>
