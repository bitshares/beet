<script setup>
    import {ref, onMounted} from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import getBlockchain from "../../../lib/blockchains/blockchainFactory";

    const props = defineProps({
      selectedChain: String
    });
    let selectedChain = ref(props.selectedChain);

    let accountname = ref("");
    let memopk = ref("");
    let accessType = ref(null);
    let requiredFields = ref(null);

    onMounted(() => {
      let blockchain = getBlockchain(selectedChain.value);
      accessType.value = blockchain.getAccessType();
      requiredFields.value = blockchain.getSignUpInput();
    })

    async function _verifyAccount() {
        if (accountname.value == "") {
            throw {
                key: "missing_account_error",
                args: {
                    chain: selectedChain.value
                }
            };
        }
        let blockchain = getBlockchain(selectedChain.value);
        let authorities = {};
        if (requiredFields.value.memo != null) {
            authorities.memo = memopk.value;
        }
        let account = await blockchain.verifyAccount(accountname.value, authorities);
        return {
            account: {
                accountName: accountname.value,
                accountID: account.id,
                chain: selectedChain.value,
                keys: authorities
            }
        };
    }

    async function getAccountEvent() {
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
            {{ t('common.account_name', { 'chain' : selectedChain}) }}
        </p>
        <input
            id="inputAccount"
            v-model="accountname"
            type="text"
            class="form-control mb-3"
            :placeholder="t('common.account_name', { 'chain' : selectedChain})"
            required
        >
        <p class="my-3 font-weight-normal">
            {{ t('common.keys_cta') }}
        </p>
        <template v-if="requiredFields.memo !== null">
            <p class="mb-2 font-weight-bold">
                {{ t('common.memo_authority') }}
            </p>
            <input
                id="inputMemo"
                v-model="memopk"
                type="password"
                class="form-control mb-3 small"
                :placeholder="t('common.memo_authority_placeholder')"
                required
            >
        </template>
        <p class="my-3 font-weight-normal">
            {{ t('common.use_only_for_messages_and_proof') }}
        </p>
    </div>
</template>
