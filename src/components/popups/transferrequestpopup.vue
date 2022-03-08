<script setup>
    import {ref, onMounted} from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import store from '../store/index';
    import RendererLogger from "../../lib/RendererLogger";
    import getBlockchain from "../../lib/blockchains/blockchainFactory";
    const logger = new RendererLogger();
    import {getKey} from '../../lib/SecureRemote';

    let type = ref("TransferRequestPopup");
    let message = ref(null);
    let recipient = ref(null);
    let satoshis = ref(null);
    let feeInSatoshis = ref(null);
    let asset_id = ref(null);
    let toSend = ref(null);
    let toSendFee = ref(null);

    ///

    let error = ref(false);
    let incoming = ref({});
    let api = ref(null);
    let allowWhitelist = ref(false);

    /////////

    async function show(incoming, newWhitelist = null) {
        store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
        incoming.value = incoming;
        _onShow();
        this.$refs.modalComponent.show();
        return new Promise((resolve, reject) => {
            this._accept = resolve;
            this._reject = reject;
        });
    }

    async function _clickedAllow() {
        // this.emitter.emit("popup", "load-start");
        // this.emitter.emit("popup", "load-end");
        this.$refs.modalComponent.hide();
        try {
            let result = await _execute();
            let notification = getSuccessNotification(result);
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
                store.dispatch(
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

    function _clickedDeny() {
        this.$refs.modalComponent.hide();
        this._reject({ canceled: true });
    }

    function _getLinkedAccount() {
        let account = store.getters['AccountStore/getSigningKey'](this.incoming);
        return {
            id: account.accountID,
            name: account.accountName,
            chain: account.chain
        }
    }

    /////////

    function _onShow() {
        message.value = t("operations.transfer.request", {
            appName: this.incoming.appName,
            origin: this.incoming.origin,
            chain:   store.getters['AccountStore/getSigningKey'](this.incoming).chain,
            accountName:   store.getters['AccountStore/getSigningKey'](this.incoming).accountName
        });

        let blockchain = getBlockchain(this.incoming.chain);

        this.to = this.incoming.params.to;
        this.satoshis = this.incoming.params.amount.satoshis;
        this.asset_id = this.incoming.params.amount.asset_id;

        this.toSend = blockchain.format(
            this.incoming.params.amount
        );

        if (blockchain.supportsFeeCalculation()) {
            this.toSendFee = "Calculating ...";
            let loadFee = async () => {
                try {
                    let result = await blockchain.transfer(
                        await getKey(store.getters['AccountStore/getSigningKey'](this.incoming).keys.active),
                        store.getters['AccountStore/getSigningKey'](this.incoming).accountName,
                        this.incoming.params.to,
                        {
                            amount: this.incoming.params.amount.satoshis || this.incoming.params.amount.amount,
                            asset_id: this.incoming.params.amount.asset_id
                        },
                        this.incoming.params.memo,
                        false
                    );
                    this.feeInSatoshis = result.feeInSatoshis;
                    this.toSendFee = blockchain.format(
                        this.feeInSatoshis
                    );
                } catch (err) {
                    console.error(err);
                    this.toSendFee = err;
                }
            };
            loadFee().then(()=>{}).catch(()=>{});
        } else {
            this.toSendFee = null;
        }
    }

    function getSuccessNotification(result) {
        return {msg: 'Transaction `transfer` successfully broadcast.', link: '' };
    }

    async function _execute() {
        let blockchain = getBlockchain(this.incoming.chain);

        if (!this.incoming.params.amount) {
            this.incoming.params.amount = this.incoming.params.satoshis;
        }

        return await blockchain.transfer(
            await getKey(store.getters['AccountStore/getSigningKey'](this.incoming).keys.active),
            store.getters['AccountStore/getSigningKey'](this.incoming).accountName,
            this.incoming.params.to,
            {
                amount: this.incoming.params.amount.satoshis || this.incoming.params.amount.amount,
                asset_id: this.incoming.params.amount.asset_id
            },
            this.incoming.params.memo,
        );
    }
</script>
<template>
    <b-modal
        id="type"
        ref="modalComponent"
        centered
        no-close-on-esc
        no-close-on-backdrop
        hide-header-close
        hide-footer
        :title="t('operations.transfer.title')"
    >
        {{ message }}:
        <br>
        <br>
        <pre class="text-left custom-content"><code>
  Recipient: {{ to }}
  Amount: {{ toSend }}
{{ toSendFee != null ? "    Fee: " + toSendFee : "" }}
        </code></pre>
        <b-btn
            class="mt-3"
            variant="success"
            block
            @click="_clickedAllow"
        >
            {{ t("operations.transfer.accept_btn") }}
        </b-btn>
        <b-btn
            class="mt-1"
            variant="danger"
            block
            @click="_clickedDeny"
        >
            {{ t("operations.transfer.reject_btn") }}
        </b-btn>
    </b-modal>
</template>
