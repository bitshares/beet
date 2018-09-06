<template>
    <div class="top">
        <div class="row">
            <div class="col-12 d-flex smallHeader">
                <img
                    class=""
                    src="img/bitshares.png"
                    alt=""
                    width="56"
                    height="56"
                >
                <h4 class="h4 font-weight-normal align-self-center">{{ $t('app_name') }}</h4>
                <LangSelect ref="langswitch" />
            </div>
        </div>
    </div>
</template>

<script>
    import LangSelect from "./lang-select";
    export default {
        name: "HeaderSmall",
        i18nOptions: { namespaces: "common" },
        components: { LangSelect },
        data() {
            return {};
        }
    };
</script>