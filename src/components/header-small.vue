<script setup>
    import { onMounted } from 'vue';
    import { useI18n } from 'vue-i18n';
    import RendererLogger from "../lib/RendererLogger";
    import langSelect from "./lang-select.vue";

    const { t } = useI18n({ useScope: 'global' });
    const logger = new RendererLogger();

    onMounted(() => {
        logger.debug("Small Header mounted");
    });
</script>

<template>
    <div class="top">
        <ui-grid class="container-fluid">
            <ui-grid-cell
                class="smallHeader"
                columns="12"
            >
                <langSelect location="small" />
                <img
                    class="logo-small"
                    src="img/beet.png"
                    alt
                >
                <h4 class="h4 beet-typo-small">
                    {{ t('common.appName') }}
                </h4>
            </ui-grid-cell>
        </ui-grid>
    </div>
</template>
