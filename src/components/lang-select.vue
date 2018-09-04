<template>
    <div class="row lang-selector">
        <div class="col-12 p-0">
            <div class="input-group mb-0">
                <select 
                    id="lang-select" 
                    v-model="selectLang" 
                    class="form-control small"
                >
                    <option 
                        v-for="loc in locales" 
                        :key="loc['code']" 
                        :value="loc['code']"
                    >{{ loc['code'] }}</option>
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
                selectLang: this.$store.state.SettingsStore.settings.locale
            };
        },
        watch: {
            selectLang: function() {
                console.log("Switching Lang.");
                this.$store.dispatch("SettingsStore/setLocale", { 'locale': this.selectLang });
            }
        },
        mounted() {
        }
    };
</script>
