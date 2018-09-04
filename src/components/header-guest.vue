<template>
    <div class="top">
        <img
            class="mb-4"
            src="img/bitshares.png"
            alt=""
            width="150"
            height="150"
        >
        <h3 class="h3 mb-3 font-weight-normal">{{ $t("welcome" ) }}</h3>
    </div>
</template>

<script>
    export default {
        name: "HeaderGuest",
        i18nOptions: { namespaces: "common" },
        data() {
            return {};
        }
    };
</script>