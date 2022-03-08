<script setup>
    import { ref, onMounted, computed } from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import AccountSelect from "../account-select";
    import store from '../store/index';
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    let error = ref(false);
    let type = ref("LinkRequestPopup");
    let chosenAccount = ref({trackId: 0});

    ///

    let type = ref(null);
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

    function _execute() {
        return {
            name: chosenAccount.value.accountName,
            chain: chosenAccount.value.chain,
            id: chosenAccount.value.accountID
        };
    }

    function clickedAllow() {
        if (chosenAccount.value.trackId == 0) {
            error.value = true;
        } else {
            error.value = false;
            _clickedAllow();
        }
    }

    onMounted() {
      logger.debug("Link Popup initialised");
      store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});

    }

    let existingLinks = computed(() => {
      return store.state.OriginStore.apps.filter(
          (x) => {
              return x.appName == this.incoming.appName
                  && x.origin==this.incoming.origin
                  && this.incoming.chain == "ANY" || x.chain==this.incoming.chain
          }
      );
    });
</script>


<template>
    <b-modal
        id="type"
        ref="modalComponent"
        class="linkStyle"
        centered
        no-close-on-esc
        no-close-on-backdrop
        hide-header-close
        hide-footer
        :title="t('operations.account_id.title')"
    >
        <div v-tooltip="t('operations.link.request_tooltip')">
            {{ t('operations.link.request', {appName: incoming.appName, origin: incoming.origin, chain: incoming.chain }) }} &#10068;
        </div>
        <br>
        <div v-if="existingLinks.length>0">
            {{ t('operations.link.request_fresh', {chain: incoming.chain }) }}
        </div>
        <br>
        <AccountSelect
            v-if="incoming.chain"
            v-model="chosenAccount"
            :chain="incoming.chain"
            :existing="existingLinks"
            :cta="t('operations.link.request_cta')"
            extraclass="accountProvide"
        />
        <b-btn
            class="mt-3"
            variant="success"
            block
            @click="clickedAllow"
        >
            {{ t('operations.link.accept_btn') }}
        </b-btn>
        <b-btn
            class="mt-1"
            variant="danger"
            block
            @click="_clickedDeny"
        >
            {{ t('operations.link.reject_btn') }}
        </b-btn>
    </b-modal>
</template>
