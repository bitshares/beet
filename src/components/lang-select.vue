<script setup>
    import { ref, onMounted, computed } from 'vue';
    import { locales, defaultLocale, selectLocales } from "../config/i18n.js";
    import RendererLogger from "../lib/RendererLogger";
    import store from '../store/index';

    const logger = new RendererLogger();

    let localesRef = computed(() => {
      return selectLocales;
    });

    /*
    let selected = computed(() => {
      return defaultLocale.iso
    });
    */

    //let localesRef = ref(locales.map(locale => locale.iso));
    let selected = ref(
      store.state.SettingsStore.settings.locale.iso ?? defaultLocale.iso
    );

    let open = ref(false);

    onMounted(() => {
        logger.debug("Language Selector mounted");
    });

    function menuClick() {
      if (open) {
        open.value = true;
      }
    }

    function onCancel() {
      if (open) {
        open.value = false;
      }
    }

    function onSelected(locale) {
      store.dispatch("SettingsStore/setLocale", {locale: locale});
      selected.value = locale.value;
      if (open) {
        open.value = false;
      }
    }
    /*

    <section :dir="null">
      <ui-select
        v-model="selected"
        :options="localesRef"
        :disabled="false"
        @selected="onSelected($event)"
      >
        {{
          selected != ''
            ? selected
            : defaultLocale.iso
        }}
      </ui-select>
    </section>

    */
</script>


<template>

  <ui-menu-anchor absolute>
    <ui-button raised @click="menuClick">
      {{selected}}
    </ui-button>
    <div v-if="open">
      <ui-menu v-model="open" @selected="onSelected" @cancel="onCancel">
        <ui-menuitem nested>

          <div v-for="locale in localesRef">
            <ui-menuitem>
              <ui-menuitem-text>
                {{locale.value}}
              </ui-menuitem-text>
            </ui-menuitem>
          </div>

        </ui-menuitem>
      </ui-menu>
    </div>
  </ui-menu-anchor>

</template>
