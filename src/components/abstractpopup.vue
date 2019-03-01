<template>
</template>
<script>
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    export default {
        name: "AbstractPopup",
        i18nOptions: { namespaces: ["common", "operations"] },
        props: [],
        data() {
            return {
                type: null,
                incoming: {},
                api: null,
                askWhitelist: false,
                allowWhitelist: false
            };
        },
        methods: {
            show: async function(incoming, askWhitelist = false) {
                this.$store.dispatch("WalletStore/notifyUser", {
                    notify: "request",
                    message: "request"
                });
                this.incoming = incoming;
                this.askWhitelist = askWhitelist;
                this.$refs.modalComponent.show();
                return new Promise((resolve, reject) => {
                    this._accept = resolve;
                    this._reject = reject;
                });
            },
            _clickedAllow: function() {
                this.$refs.modalComponent.hide();
                try {
                    this._accept(
                        {
                            response: this._getResponse(),
                            whitelisted: this.allowWhitelist
                        }
                    );
                } catch (err) {
                    console.log(err);
                    this._reject({ error: err });
                }
            },
            _getResponse: function() {
                // to overwrite
                throw Error("Needs implementation")
            },
            _clickedDeny: function() {
                this.$refs.modalComponent.hide();
                this._reject({ canceled: true });
            }
        }
    };
</script> 