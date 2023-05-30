<script setup>
    import {ref, inject, computed} from "vue";
    import { ipcRenderer } from 'electron';

    const emitter = inject('emitter');
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import getBlockchainAPI from "../../lib/blockchains/blockchainFactory";

    const props = defineProps({
        chain: {
            type: String,
            required: true,
            default: ''
        }
    });

    let accountname = ref("");
    let activepk = ref("");
    let ownerpk = ref("");
    let memopk = ref("");
    let includeOwner = ref(0);

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

        if (requiredFields.value.active != null) {
            authorities.active = activepk.value;
        }
        if (requiredFields.value.memo != null) {
            authorities.memo = memopk.value;
        }
        if (includeOwner.value == 1 && requiredFields.value.owner != null) {
            authorities.owner = ownerpk.value;
        }

        let account;
        try {
            account = await blockchain.verifyAccount(accountname.value, authorities);
        } catch (error) {
            console.log(error);
            ipcRenderer.send("notify", t("common.unverified_account_error"));
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
            {{ t(accessType == 'account' ? 'common.account_name' : 'common.address_name', { 'chain' : chain}) }}
        </p>
        <input
            id="inputAccount"
            v-model="accountname"
            type="text"
            class="form-control mb-3"
            :placeholder="t(accessType == 'account' ? 'common.account_name' : 'common.address_name', { 'chain' : chain})"
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
            <ui-form-field>
                <ui-checkbox
                    v-model="includeOwner"
                    value="1"
                    unchecked-value="0"
                    input-id="incOwnerCB"
                />
                <label>{{ t('common.include_owner_check') }}</label>
            </ui-form-field>
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

        <ui-grid>
            <ui-grid-cell columns="12">
                <ui-button
                    outlined
                    class="step_btn"
                    @click="back"
                >
                    {{ t('common.back_btn') }}
                </ui-button>

                <span v-if="includeOwner == 1 && requiredFields.memo != null && requiredFields.active != null">
                    <ui-button
                        v-if="
                            accountname !== ''
                                && ownerpk !== ''
                                && memopk !== ''
                                && activepk !== ''
                        "
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
                </span>
                <span v-else-if="includeOwner == 0 && requiredFields.memo != null && requiredFields.active != null">
                    <ui-button
                        v-if="
                            accountname !== ''
                                && memopk !== ''
                                && activepk !== ''
                        "
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
                </span>
                <span v-else>
                    <ui-button
                        disabled
                        class="step_btn"
                        type="submit"
                    >
                        {{ t('common.next_btn') }}
                    </ui-button>
                </span>
            </ui-grid-cell>
        </ui-grid>
    </div>
</template>
