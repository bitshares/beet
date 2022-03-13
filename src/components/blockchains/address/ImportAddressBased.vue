<script setup>
    import {ref, onMounted, inject} from "vue";
    const emitter = inject('emitter');
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import getBlockchainAPI from "../../../lib/blockchains/blockchainFactory";

    const props = defineProps({
      chain: String
    });

    let address = ref("");
    let activepk = ref("");
    let requiredFields = ref(null);

    onMounted(() => {
      // onmount/compute the following?
      let blockchain = getBlockchainAPI(props.chain);
      requiredFields.value = blockchain.getSignUpInput();
    });

    async function _verifyAccount() {
        if (!address || !address.value || address.value == "") {
            throw {
                key: "missing_account_error",
                args: {
                    chain: props.chain
                }
            };
        }
        let blockchain = getBlockchainAPI(props.chain);
        let authorities = {};
        if (requiredFields.value.active != null) {
            authorities.active = activepk.value;
        }

        let account;
        try {
          account = await blockchain.verifyAccount(address.value, authorities);
        } catch (error) {
          console.error(error)
          return;
        }

        return {
            account: {
                accountName: address.value,
                accountID: account.id,
                chain: props.chain,
                keys: authorities
            }
        };
    }

    function back() {
      // emit back
    }

    async function next() {
      let account = await _verifyAccount();
      if (account.accountID !== null) {
          return [account];
      } else {
          throw "This shouldn't happen!"
      }
    }
</script>

<template>
    <div id="step2">
        <p class="mb-2 font-weight-bold">
            {{ t('common.address_name', { 'chain' : chain}) }}
        </p>
        <input
            id="inputAccount"
            v-model="address"
            type="text"
            class="form-control mb-3"
            :placeholder="t('common.address_name', { 'chain' : chain})"
            required
        >
        <p class="my-3 font-weight-normal">
            {{ t('common.keys_cta') }}
        </p>
        <template v-if="requiredFields.public !== null">
            <p class="mb-2 font-weight-bold">
                {{ t('common.public_authority') }}
            </p>
            <input
                id="inputActive"
                v-model="activepk"
                type="password"
                class="form-control mb-3 small"
                :placeholder="t('common.public_authority_placeholder')"
                required
            >
        </template>
        <ui-grid>
            <ui-grid-cell columns="12">
                  <ui-button outlined class="step_btn" @click="step1">
                      {{ t('common.back_btn') }}
                  </ui-button>

                  <ui-button raised class="step_btn" type="submit" @click="step3">
                      {{ t('common.next_btn') }}
                  </ui-button>
            </ui-grid-cell>
        </ui-grid>
    </div>

</template>
