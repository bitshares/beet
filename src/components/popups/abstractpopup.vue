<template />
<script>
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    export default {
        name: "AbstractPopup",
        i18nOptions: { namespaces: ["common", "operations"] },
        props: [],
        data() {
            return {
                type: null,
                error: false,
                incoming: {},
                api: null,
                askWhitelist: false,
                allowWhitelist: false
            };
        },
        methods: {
            show: async function(incoming, askWhitelist = null) {
                this.$store.dispatch("WalletStore/notifyUser", {
                    notify: "request",
                    message: "request"
                });
                this.incoming = incoming;
                if (askWhitelist !== null) {
                    this.askWhitelist = askWhitelist;
                }
                this._onShow();
                this.$refs.modalComponent.show();
                return new Promise((resolve, reject) => {
                    this._accept = resolve;
                    this._reject = reject;
                });
            },
            _onShow: function() {
                // to overwrite, do nothing in default
            },
            _clickedAllow: async function() {
                // EventBus.$emit("popup", "load-start");
                // EventBus.$emit("popup", "load-end");
                this.$refs.modalComponent.hide();
                try {
                    let result = await this._execute();
                    // todo allowWhitelist move whitelisting to BeetAPI, thus return flag here
                    this._accept(
                        {
                            response: result,
                            whitelisted: this.allowWhitelist
                        }
                    );
                    if (this.allowWhitelist) {
                        // todo: allowWhitelist move whitelisting into BeetAPI
                        this.$store.dispatch(
                            "WhitelistStore/addWhitelist",
                            {
                                identityhash: this.incoming.identityhash,
                                method: this.type
                            }
                        );
                    }
                } catch (err) {
                    console.error(err);
                    this._reject({ error: err });
                }
            },
            _execute: function() {
                // to overwrite
                throw "Needs implementation"
            },
            execute: function(payload) {
                this.incoming = payload;
                return new Promise((resolve,reject) => {
                    try {
                        resolve(this._execute());
                    } catch (err) {
                        reject(err);
                    }
                });
            },
            _clickedDeny: function() {
                this.$refs.modalComponent.hide();
                this._reject({ canceled: true });
            }
        }
    };
</script> 