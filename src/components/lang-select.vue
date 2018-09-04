<template>

<div class="row lang-selector">
    <div class="col-12 p-0">
                        <div class="input-group mb-0">
                            <select class="form-control small" id="lang-select" v-model="selectedLang">
                                <option v-for="loc in locales" v-bind:value="loc['code']" v-bind:key="loc['code']">{{loc['code']}}</option>
                            </select>
                        </div>
                    </div>
                    </div>
</template>

<script>
import { locales } from "../config/i18n.js";


export default {
  name: "LangSelect",
  i18nOptions: { namespaces: "common" },
  data() {
    return {
     locales:locales,
     selectedlang: this.$store.state.SettingsStore.settings.locale
    };
  },
  watch: {
    selectedLang: function() {
      console.log("Switching Lang.");
      this.$store.dispatch("SettingsStore/setLocale", { 'locale': this.selectedLang });
    }
  },
  mounted() {
  }
};
</script>
