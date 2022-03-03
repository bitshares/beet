<script setup>
    import LangSelect from "./lang-select";
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    onMounted(() => {
      logger.debug("Standard Header mounted");
    });
</script>

<template>
    <div class="top">
      <ui-grid class="container-fluid">
          <ui-grid-cell class="largeHeader" columns="12">
                <img
                    src="img/beet.png"
                    alt
                    width="150"
                    height="150"
                >
                <div class="beet-typo">
                    beet
                </div>
                <h3 class="h3">
                    {{ $t("common.welcome" ) }}
                </h3>
                <LangSelect ref="langswitch" />
            </ui-grid-cell>
        </ui-grid>
    </div>
</template>
