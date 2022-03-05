<script setup>
    import {ref} from "vue";
    import RendererLogger from "../../lib/RendererLogger";

    const logger = new RendererLogger();

    let type = ref(null);
    let error = ref(false);
    let incoming = ref({});
    let api = ref(null);
    let askWhitelist = ref(false);
    let allowWhitelist = ref(false);

    async function show(incoming, askWhitelist = null) {
        this.$store.dispatch("WalletStore/notifyUser", {
            notify: "request",
            message: "request"
        });
        this.incoming = incoming;
        if (askWhitelist !== null) {
            this.askWhitelist = askWhitelist;
        }
        _onShow();
        this.$refs.modalComponent.show();
        return new Promise((resolve, reject) => {
            this._accept = resolve;
            this._reject = reject;
        });
    }

    function _onShow() {
        // to overwrite, do nothing in default
    }

    function getSuccessNotification(res) {
        return false;
    }

    async function _clickedAllow() {
        // this.emitter.emit("popup", "load-start");
        // this.emitter.emit("popup", "load-end");
        this.$refs.modalComponent.hide();
        try {
            let result = await this._execute();
            let notification = this.getSuccessNotification(result);
            if (notification) {
                this.emitter.emit("tx-success", notification);
            }
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
            this._reject({ error: err });
        }
    }

    function _execute() {
        // to overwrite
        throw "Needs implementation"
    }

    function execute(payload) {
        this.incoming = payload;
        return new Promise((resolve,reject) => {
            try {
                resolve(this._execute());
            } catch (err) {
                reject(err);
            }
        });
    }

    function _clickedDeny() {
        this.$refs.modalComponent.hide();
        this._reject({ canceled: true });
    }

    function _getLinkedAccount() {
        let account = this.$store.getters['AccountStore/getSigningKey'](this.incoming);
        return {
            id: account.accountID,
            name: account.accountName,
            chain: account.chain
        }
    }
</script>

<template />
