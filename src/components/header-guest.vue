<script setup>
    import { onMounted } from 'vue';
    import { useI18n } from 'vue-i18n';
    import langSelect from "./lang-select.vue";
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();
    const { t } = useI18n({ useScope: 'global' });

    onMounted(() => {
        logger.debug("Standard Header mounted");
    });
</script>

<template>
    <div class="top">
        <ui-grid class="container-fluid">
            <ui-grid-cell
                class="largeHeader"
                columns="12"
            >
                <langSelect location="guest" />
                <img
                    src="img/beet.png"
                    alt
                    width="150"
                    height="150"
                >
                <div class="beet-typo">
                    Beet
                </div>
                <h3 class="h3">
                    {{ t("common.welcome" ) }}
                </h3>
            </ui-grid-cell>
        </ui-grid>
    </div>
</template>
