<template>
    <b-modal
        id="type"
        ref="modalComponent"
        centered
        no-close-on-esc
        no-close-on-backdrop
        hide-header-close
        hide-footer
        :title="incoming.generic.title"
    >
        {{ incoming.generic.message }}:
        <br>
        <br>
        <pre class="text-left custom-content">
                <code>
                    {{ incoming.generic.details }}
                </code>
            </pre>
        <b-form-checkbox v-model="allowWhitelist" v-if="askWhitelist">  {{ $t('operations:whitelist.prompt', { method: incoming.method }) }}</b-form-checkbox>
        <b-btn
                class="mt-3"
                variant="success"
                block
                @click="_clickedAllow"
        >
            {{ incoming.generic.acceptText || $t('operations:rawsig.accept_btn') }}
        </b-btn>
        <b-btn
                class="mt-1"
                variant="danger"
                block
                @click="_clickedDeny"
        >
            {{ incoming.generic.rejectText || $t('operations:rawsig.reject_btn') }}
        </b-btn>
    </b-modal>
</template>
<script>
    import AbstractPopup from "./abstractpopup";
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    export default {
        name: "GenericRequestPopup",
        extends: AbstractPopup,
        data() {
            return {
                type: "GenericRequestPopup",
                incoming: {
                    generic: {}
                }
            };
        },
        _getResponse: function () {
            if (!!this.incoming.acceptCall) {
                this.incoming.acceptCall();
            }
            if (this.allowWhitelist) {
                this.$store.dispatch(
                    "WhitelistStore/addWhitelist",
                    {
                        identityhash: this.incoming.identityhash,
                        method: 'signMessage'
                    }
                );
            }
        }
    };
</script> 