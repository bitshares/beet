<script setup>
    import { onMounted } from 'vue';
    import LangSelect from "./lang-select";
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    onMounted(() => {
      logger.debug("Small Header mounted");
    });
</script>

<template>
    <div class="top">
      <ui-grid class="container-fluid">
          <ui-grid-cell class="smallHeader" columns="12">
                <img
                    class="logo-small"
                    src="img/beet.png"
                    alt
                >
                <h4 class="h4 beet-typo-small">
                    {{ $t('common.appName') }}
                </h4>
                <LangSelect ref="langswitch" />
          </ui-grid-cell>
      </ui-grid>
    </div>
</template>
