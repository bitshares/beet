<template>
    <div class="top">
        <div class="container-fluid">
            <div class="row">
                <div class="col-12 largeHeader">
                    <img            
                        src="img/beet.png"
                        alt=""
                        width="150"
                        height="150"
                    >
                    <div class="beet-typo mb-3">beet</div>
                    <h3 class="h3 mb-3 font-weight-normal">{{ $t("welcome" ) }}</h3>
                    <LangSelect ref="langswitch" />
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import LangSelect from "./lang-select";
    export default {
        name: "HeaderGuest",
        i18nOptions: { namespaces: "common" },
        components: { LangSelect },
        data() {
            return {};
        }
    };
</script>