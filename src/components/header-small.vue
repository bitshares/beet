<template>
    <div class="top">
        <div class="container-fluid">
            <div class="row">
                <div class="col-12 d-flex smallHeader">
                    <img
                        class="logo-small"
                        src="img/beet.png"
                        alt
                    >
                    <h4 class="h4 beet-typo-small">
                        {{ $t('appName') }}
                    </h4>
                    <LangSelect ref="langswitch" />
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import LangSelect from "./lang-select";
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    export default {
        name: "HeaderSmall",
        i18nOptions: { namespaces: "common" },
        components: { LangSelect },
        data() {
            return {};
        },
        mounted() {
            logger.debug("Small Header mounted");
        }
    };
</script>