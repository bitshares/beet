<script setup>
    import { ref, onMounted } from 'vue';

    import { locales } from "../config/i18n.js";
    import Multiselect from '@vueform/multiselect'

    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    function selectLang(option) {
      this.$store.dispatch("SettingsStore/setLocale", {
          locale: option
      });
    }
    
    onMounted(() => {
        logger.debug("Language Selector mounted");
    });
</script>


<template>
  <Multiselect
    v-model="value"
    :options="locales"
  >
    <template v-slot:singlelabel="{ value }">
      <div class="multiselect-single-label">
        {{ value.iso }}
      </div>
    </template>

    <template v-slot:option="{ option }" @click="selectLang(option)">
      {{ option.iso }}
    </template>
  </Multiselect>
</template>
