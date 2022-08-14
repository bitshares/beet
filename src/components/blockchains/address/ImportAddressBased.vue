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

    let address = ref("");
    let activepk = ref("");

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

        emitter.emit('accounts_to_import', [{
            account: {
                accountName: address.value,
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
                <ui-button
                    outlined
                    class="step_btn"
                    @click="back"
                >
                    {{ t('common.back_btn') }}
                </ui-button>

                <ui-button
                    v-if="address !== ''"
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
