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

    let positioning = computed(() => {
        return props.location === "prompt" ? 'top left' : 'bottom start';
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

    function onSelected(locale) {
        emitter.emit('i18n', locale.value);
        store.dispatch("SettingsStore/setLocale", {locale: locale.value});
        selected.value = locale.value;
        open.value = false;
    }
</script>


<template>
    <ui-menu-anchor v-if="location === 'prompt'" absolute position='top left'>
        <ui-fab
            style="margin-top:50px;"
            icon="translate"
            @click="menuClick"
            mini
        />
        <ui-menu
            v-model="open"
            style="border: 1px solid #C7088E;"
            position="BOTTOM_START"
            :items="localesRef"
            @selected="onSelected"
        />
    </ui-menu-anchor>
    <ui-menu-anchor v-else absolute position='bottom start'>
        <ui-fab
            style="margin-top:50px;"
            icon="translate"
            @click="menuClick"
            mini
        />
        <ui-menu
            v-model="open"
            style="border: 1px solid #C7088E;"
            position="BOTTOM_START"
            :items="localesRef"
            @selected="onSelected"
        />
    </ui-menu-anchor>
</template>
