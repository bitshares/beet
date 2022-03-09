<script setup>
    import {ref, onMounted} from "vue";
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    import {PrivateKey} from "bitsharesjs";
    import getBlockchain from "../../../lib/blockchains/blockchainFactory";

    const props = defineProps({
      selectedChain: String
    });

    let selectedChain = ref(props.selectedChain);

    onMounted(() => {
      if (!["BTS", "TUSC"].includes(selectedChain.value)) {
          throw "Unsupported chain!";
      }
    })

    let accountname = ref("");
    let accountID = ref("");
    let bitshares_cloud_login_password = ref("");

    function getAuthoritiesFromPass(password, legacy=false) {
        let active_seed = accountname.value + 'active' + password;
        let owner_seed = accountname.value + 'owner' + password;
        let memo_seed = accountname.value + 'memo' + password;
        if (legacy) {
            return {
                active: PrivateKey.fromSeed(active_seed).toWif(),
                memo: PrivateKey.fromSeed(active_seed).toWif(),
                owner: PrivateKey.fromSeed(owner_seed).toWif()
            };
        } else {
            return {
                active: PrivateKey.fromSeed(active_seed).toWif(),
                memo: PrivateKey.fromSeed(memo_seed).toWif(),
                owner: PrivateKey.fromSeed(owner_seed).toWif()
            };
        }
    }

    async function _verifyAccount() {
        if (accountname.value == "") {
            throw {
                key: "missing_account_error",
                args: {
                    chain: props.selectedChain
                }
            };
        }

        if (bitshares_cloud_login_password.value == "") {
            throw {
                key: "empty_pass_error"
            };
        }

        let blockchain = getBlockchain(props.selectedChain);
        // abstract UI concept more
        let authorities = getAuthoritiesFromPass(bitshares_cloud_login_password.value);
        let account = null;
        try {
            account = await blockchain.verifyAccount(accountname.value, authorities);
        } catch (e) {
            authorities = getAuthoritiesFromPass(bitshares_cloud_login_password.value, true);
            account = await blockchain.verifyAccount(accountname.value, authorities);
            //TODO: Should notify user of legacy/dangerous permissions (active==memo)
        }
        return {
            account: {
                accountName: accountname.value,
                accountID: account.id,
                chain: props.selectedChain,
                keys: authorities
            }
        };
    }

    async function getAccountEvent() {
        let account = await _verifyAccount();
        if (accountID.value !== null) {
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
            :placeholder="t('common.account_name',{ 'chain' : selectedChain})"
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
    </div>
</template>
