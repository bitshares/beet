<script setup>
    import { ref } from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import getBlockchain from "../../lib/blockchains/blockchainFactory";

    const selectedChain = defineProps(["selectedChain"]);

    let accountname = ref("");
    let activepk = ref("");
    let ownerpk = ref("");
    let memopk = ref("");
    let includeOwner = ref(0);
    let accessType = ref(null);
    let requiredFields = ref(null);

    // onMount/compute the following?
    let blockchain = getBlockchain(this.selectedChain);
    accessType.value = blockchain.getAccessType();
    requiredFields.value = blockchain.getSignUpInput();

    async function _verifyAccount() {
        if (accountname.value == "") {
            throw {
                key: "missing_account_error",
                args: {
                    chain: this.selectedChain
                }
            };
        }
        let blockchain = getBlockchain(this.selectedChain);
        let authorities = {};
        if (requiredFields.value.active != null) {
            authorities.active = activepk.value;
        }
        if (requiredFields.value.memo != null) {
            authorities.memo = memopk.value;
        }
        if (includeOwner.value == 1 && requiredFields.value.owner != null) {
            authorities.owner = ownerpk.value;
        }
        let account = await blockchain.verifyAccount(accountname.value, authorities);
        return {
            account: {
                accountName: accountname.value,
                accountID: account.id,
                chain: this.selectedChain,
                keys: authorities
            }
        };
    }

    async function getAccountEvent() {
        let account = await _verifyAccount();
        if (this.accountID !== null) {
            return [account];
        } else {
            throw "This shouldn't happen!"
        }
    }
</script>

<template>
    <div id="step2">
        <h4 class="h4 mt-3 font-weight-bold">
            {{ t('common.step_counter',{ step_no : 2}) }}
        </h4>
        <p class="mb-2 font-weight-bold">
            {{ t(accessType == 'account' ? 'common.account_name' : 'common.address_name', { 'chain' : selectedChain}) }}
        </p>
        <input
            id="inputAccount"
            v-model="accountname"
            type="text"
            class="form-control mb-3"
            :placeholder="t(accessType == 'account' ? 'common.account_name' : 'common.address_name', { 'chain' : selectedChain})"
            required
        >
        <p class="my-3 font-weight-normal">
            {{ t('common.keys_cta') }}
        </p>
        <template v-if="requiredFields.active !== null">
            <p class="mb-2 font-weight-bold">
                {{ t(accessType == 'account' ? 'common.active_authority' : 'common.public_authority') }}
            </p>
            <input
                id="inputActive"
                v-model="activepk"
                type="password"
                class="form-control mb-3 small"
                :placeholder="t(accessType == 'account' ? 'common.active_authority_placeholder' : 'common.public_authority_placeholder')"
                required
            >
        </template>
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
        <template v-if="requiredFields.owner !== null">
            <b-form-checkbox
                id="incOwnerCB"
                v-model="includeOwner"
                value="1"
                unchecked-value="0"
                class="mb-3"
            >
                {{ t('common.include_owner_check') }}
            </b-form-checkbox>
            <div v-if="includeOwner == 1">
                <input
                    id="inputOwner"
                    v-model="ownerpk"
                    type="password"
                    class="form-control mb-3 small"
                    :placeholder="t('common.owner_authority_placeholder')"
                    required
                >
            </div>
        </template>
    </div>

</template>
