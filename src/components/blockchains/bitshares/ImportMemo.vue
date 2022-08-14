<script setup>
    import {ref, inject, computed} from "vue";
    const emitter = inject('emitter');
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import getBlockchainAPI from "../../../lib/blockchains/blockchainFactory";

    const props = defineProps({
        chain: {
            type: String,
            required: true,
            default: ''
        }
    });

    let accountname = ref("");
    let memopk = ref("");

    let accessType = computed(() => {
        if (!props.chain) {
            return null;
        }
        let blockchain = getBlockchainAPI(props.chain);
        return blockchain.getAccessType();
    });

    let requiredFields = computed(() => {
        if (!props.chain) {
            return null;
        }
        let blockchain = getBlockchainAPI(props.chain);
        return blockchain.getSignUpInput();
    });

    function back() {
        emitter.emit('back', true);
    }

    async function next() {
        let blockchain = getBlockchainAPI(props.chain);
        let authorities = {};
        if (requiredFields.value.memo != null) {
            authorities.memo = memopk.value;
        }

        let account;
        try {
            account = await blockchain.verifyAccount(accountname.value, authorities);
        } catch (error) {
            console.log(error);
            return;
        }

        emitter.emit('accounts_to_import', [{
            account: {
                accountName: accountname.value,
                accountID: account.id,
                chain: props.chain,
                keys: authorities
            }
        }]);
    }
</script>

<template>
    <div id="step2">
        <p class="mb-2 font-weight-bold">
            {{ t('common.account_name', { 'chain' : chain}) }}
        </p>
        <input
            id="inputAccount"
            v-model="accountname"
            type="text"
            class="form-control mb-3"
            :placeholder="t('common.account_name', { 'chain' : chain})"
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

        <ui-grid>
            <ui-grid-cell columns="12">
                <ui-button
                    outlined
                    class="step_btn"
                    @click="back"
                >
                    {{ t('common.back_btn') }}
                </ui-button>

                <ui-button
                    v-if="accountname !== ''"
                    raised
                    class="step_btn"
                    type="submit"
                    @click="next"
                >
                    {{ t('common.next_btn') }}
                </ui-button>
                <ui-button
                    v-else
                    disabled
                    class="step_btn"
                    type="submit"
                >
                    {{ t('common.next_btn') }}
                </ui-button>
            </ui-grid-cell>
        </ui-grid>
    </div>
</template>
