<template>
    <multiselect
        v-model="selectLang" 
        :options="locales"
        :value="this.$store.state.SettingsStore.settings.locale"
        :searchable="false"
        :allow-empty="false"
        label="name"
        track-by="iso"
        class="lang-select"
    > 
        <template 
            slot="singleLabel" 
            slot-scope="props"
        >
            
            <span class="option__desc"><span class="option__title singleLabel">{{ props.option.iso }}</span></span>
        </template>
        <template 
            slot="option" 
            slot-scope="props"
        >
            
            <span class="option__desc"><span class="option__title options"><span class="isoCode">{{ props.option.iso }}</span> - {{ props.option.name }}</span></span>
        </template>
    </multiselect>
</template>

<script>
    import { locales } from "../config/i18n.js";
    import Multiselect from 'vue-multiselect'
    import i18next from 'i18next';
    


    export default {
        name: "LangSelect",
        i18nOptions: { namespaces: "common" },
        components: { Multiselect },
        data() {
            return {
                locales:locales,
                selectLang: this.$store.state.SettingsStore.settings.locale
            };
        },
        watch: {
            selectLang: function() {                
                this.$store.dispatch("SettingsStore/setLocale", { 'locale': this.selectLang });
                i18next.changeLanguage(this.selectLang.iso);
            }
        },
        mounted() {
        }
    };
</script>
