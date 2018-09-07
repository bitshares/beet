<template>
    <b-modal
        id="linkRequest"
        ref="linkReqModal"
        centered
        no-close-on-esc
        no-close-on-backdrop
        hide-header-close
        hide-footer
        :title="$t('link_request')"
    >
        {{ this.$data.genericmsg }}:
        <br>
        <br>        
    </b-modal>
</template>

<script>
    export default {
        name: "Popups",
        i18nOptions: { namespaces: "common" },        
        data() {
            return {
                genericmsg: ''
            };
        },        
        methods: {
            link: async function() {
                await this.$refs.linkReqModal.show();
            }
        }
    };
</script>