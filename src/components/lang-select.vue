<script setup>
    import { ref, onMounted, computed, inject, defineProps } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { defaultLocale, selectLocales, menuLocales } from "../config/i18n.js";
    import RendererLogger from "../lib/RendererLogger";
    import store from '../store/index';

    const { t } = useI18n({ useScope: 'global' });
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

    let location = computed(() => {
        return props.location;
    });

    let selected = ref(
        store.state.SettingsStore.settings.locale?.iso ?? defaultLocale.iso
    );

    let open = ref(false);

    onMounted(() => {
        logger.debug("Language Selector mounted");
    });

    function menuClick() {
        open.value = true;
    }

    function onSelected(locale) {
        const detectedLocale = selectLocales[locale.index].value
        emitter.emit('i18n', detectedLocale);
        store.dispatch("SettingsStore/setLocale", {locale: detectedLocale});
        selected.value = detectedLocale;
        open.value = false;
    }
</script>

<template>
    <ui-menu-anchor
        v-if="location === 'prompt'"
        absolute
    >
        <ui-button
            raised
            icon="translate"
            @click="menuClick"
        >
            {{ t('common.popup.language') }}
        </ui-button>
        <ui-menu
            v-model="open"
            style="border: 1px solid #C7088E; color: black;"
            position="BOTTOM_START"
            @selected="onSelected"
        >
            <ui-menuitem
                v-for="item in selectLocales"
                :key="item.value"
                :value="item.value"
            >
                {{ item.label }}
            </ui-menuitem>
        </ui-menu>
    </ui-menu-anchor>
    <ui-menu-anchor
        v-else
        absolute
        position="bottom start"
    >
        <ui-fab
            icon="translate"
            mini
            @click="menuClick"
        />
        <ui-menu
            v-model="open"
            style="border: 1px solid #C7088E;"
            position="BOTTOM_START"
            @selected="onSelected"
        >
            <ui-menuitem
                v-for="locale in selectLocales"
                :key="locale.value"
                :value="locale.label"
            >
                {{ locale.label }}
            </ui-menuitem>
        </ui-menu>
    </ui-menu-anchor>
</template>
