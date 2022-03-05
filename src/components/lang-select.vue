<script setup>
    import { ref, onMounted } from 'vue';
    import { locales } from "../config/i18n.js";
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    function onSelected(locale) {
      this.$store.dispatch("SettingsStore/setLocale", {
          locale: locale.value.iso
      });
    }

    let selected = ref('');

    onMounted(() => {
        logger.debug("Language Selector mounted");
    });
</script>


<template>
  <section :dir="null">
    <ui-select
      id="full-func-js-select"
      v-model="selected"
      :options="locales"
      :class="{}"
      :disabled="false"
      @selected="onSelected($event)"
    >
      Language select
    </ui-select>
  </section>
</template>
