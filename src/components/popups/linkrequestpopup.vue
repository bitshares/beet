<script setup>
    import { ref, onMounted, computed } from "vue";
    import AbstractPopup from "./abstractpopup";
    import AccountSelect from "../account-select";
    import RendererLogger from "../../lib/RendererLogger";
    const logger = new RendererLogger();

    let error = ref(false);
    let type = ref("LinkRequestPopup");
    let chosenAccount = ref({trackId: 0});

    //extends: AbstractPopup,

    function _onShow() {
        error.value = false;
        chosenAccount.value = {trackId: 0};
    }

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
    }

    let existingLinks = computed(() => {
      return this.$store.state.OriginStore.apps.filter(
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
        :title="$t('operations.account_id.title')"
    >
        <div v-tooltip="$t('operations.link.request_tooltip')">
            {{ $t('operations.link.request', {appName: incoming.appName, origin: incoming.origin, chain: incoming.chain }) }} &#10068;
        </div>
        <br>
        <div v-if="existingLinks.length>0">
            {{ $t('operations.link.request_fresh', {chain: incoming.chain }) }}
        </div>
        <br>
        <AccountSelect
            v-if="incoming.chain"
            v-model="chosenAccount"
            :chain="incoming.chain"
            :existing="existingLinks"
            :cta="$t('operations.link.request_cta')"
            extraclass="accountProvide"
        />
        <b-btn
            class="mt-3"
            variant="success"
            block
            @click="clickedAllow"
        >
            {{ $t('operations.link.accept_btn') }}
        </b-btn>
        <b-btn
            class="mt-1"
            variant="danger"
            block
            @click="_clickedDeny"
        >
            {{ $t('operations.link.reject_btn') }}
        </b-btn>
    </b-modal>
</template>
