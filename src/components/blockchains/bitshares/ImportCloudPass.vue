<script setup>
    import {ref, onMounted, inject} from "vue";
    import { useI18n } from 'vue-i18n';
    import {PrivateKey} from "bitsharesjs";
    import getBlockchainAPI from "../../../lib/blockchains/blockchainFactory";

    const emitter = inject('emitter');
    const { t } = useI18n({ useScope: 'global' });

    const props = defineProps({
        chain: {
            type: String,
            required: true,
            default: ''
        }
    });

    onMounted(() => {
        if (!["BTS", "BTS_TEST", "TUSC"].includes(props.chain)) {
            throw "Unsupported chain!";
        }
    })

    let accountname = ref("");
    let bitshares_cloud_login_password = ref("");
    let legacy = ref(false);

    let inProgress = ref();
    let errorOcurred = ref();

    function getAuthoritiesFromPass(legacyMode=false) {
        let active_seed = accountname.value + 'active' + bitshares_cloud_login_password.value;
        let owner_seed = accountname.value + 'owner' + bitshares_cloud_login_password.value;
        let memo_seed = accountname.value + 'memo' + bitshares_cloud_login_password.value;
        return legacyMode
            ? {
                active: PrivateKey.fromSeed(active_seed).toWif(),
                memo: PrivateKey.fromSeed(active_seed).toWif(), // legacy wallets improperly used active key for memo
                owner: PrivateKey.fromSeed(owner_seed).toWif()
            }
            : {
                active: PrivateKey.fromSeed(active_seed).toWif(),
                memo: PrivateKey.fromSeed(memo_seed).toWif(),
                owner: PrivateKey.fromSeed(owner_seed).toWif()
            };
    }

    function back() {
        emitter.emit('back', true);
    }

    async function next() {
        inProgress.value = true;
        errorOcurred.value = false;

        let blockchain;
        try {
            blockchain = getBlockchainAPI(props.chain);
        } catch (error) {
            console.log(error);
            errorOcurred.value = true;
            inProgress.value = false;
            return;
        }

        // abstract UI concept more
        let authorities;
        try {
            authorities = getAuthoritiesFromPass(legacy.value);
        } catch (error) {
            console.log(error);
            errorOcurred.value = true;
            inProgress.value = false;
            return;
        }

        let account;
        try {
            account = await blockchain.verifyAccount(accountname.value, authorities);
        } catch (error) {
            console.log(error);
            errorOcurred.value = true;
            inProgress.value = false;
            return;
        }

        if (account) {
            inProgress.value = false;
            emitter.emit('accounts_to_import', [{
                account: {
                    accountName: accountname.value,
                    accountID: account.id,
                    chain: props.chain,
                    keys: authorities
                }
            }]);
        }
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
            :placeholder="t('common.account_name',{ 'chain' : chain})"
            required
        >
        <p class="my-3 font-weight-normal">
            {{ t('common.btspass_cta') }}
        </p>
        <input
            id="inputActive"
            v-model="bitshares_cloud_login_password"
            type="password"
            class="form-control mb-3 small"
            :placeholder="t('common.btspass_placeholder')"
            required
        >
        <br>
        <br>
        <ui-form-field>
            <ui-checkbox v-model="legacy" />
            <label>Legacy key mode</label>
        </ui-form-field>
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
                    v-if="accountname !== '' && bitshares_cloud_login_password !== '' && !inProgress && !errorOcurred"
                    raised
                    class="step_btn"
                    type="submit"
                    @click="next"
                >
                    {{ t('common.next_btn') }}
                </ui-button>
                <span v-if="accountname !== '' && bitshares_cloud_login_password !== '' && errorOcurred">
                    <ui-button
                        raised
                        class="step_btn"
                        type="submit"
                        @click="next"
                    >
                        {{ t('common.next2_btn') }}
                    </ui-button>
                    <br>
                    <ui-alert state="warning">
                        {{ t('common.error_text') }}
                    </ui-alert>
                </span>
                <figure v-if="accountname !== '' && bitshares_cloud_login_password !== '' && inProgress">
                    <ui-progress indeterminate />
                    <br>
                    <figcaption>Connecting to blockchain</figcaption>
                </figure>
                <ui-button
                    v-if="accountname === '' || bitshares_cloud_login_password === ''"
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
