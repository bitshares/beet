<template>
    <div
        id="step2"
    >
        <h4 class="h4 mt-3 font-weight-bold">
            {{ $t('step_counter',{ 'step_no' : 2}) }}
        </h4>
        <p
            class="mb-2 font-weight-bold"
        >
            {{ $t('address_name', { 'chain' : selectedChain}) }}
        </p>
        <input
            id="inputAccount"
            v-model="adress"
            type="text"
            class="form-control mb-3"
            :placeholder="$t('address_name', { 'chain' : selectedChain})"
            required
        >
        <p class="my-3 font-weight-normal">
            {{ $t('keys_cta') }}
        </p>
        <template v-if="requiredFields.public !== null">
            <p
                class="mb-2 font-weight-bold"
            >
                {{ $t('public_authority') }}
            </p>
            <input
                id="inputActive"
                v-model="activepk"
                type="password"
                class="form-control mb-3 small"
                :placeholder="$t('public_authority_placeholder')"
                required
            >
        </template>
    </div>

</template>

<script>
    import getBlockchain from "../../../lib/blockchains/blockchainFactory";

    export default {
        name: "ImportAddressBased",
        i18nOptions: { namespaces: "common" },
        props: [ "selectedChain" ],
        data() {
            return {
                adress: "",
                activepk: "",
                requiredFields: null
            };
        },
        created() {
            let blockchain = getBlockchain(this.selectedChain);
            this.requiredFields = blockchain.getSignUpInput();
        },
        methods: {
            _verifyAccount: async function() {
                if (this.adress == "") {
                    throw {
                        key: "missing_account_error",
                        args: {
                            chain: this.selectedChain
                        }
                    };
                }
                let blockchain = getBlockchain(this.selectedChain);
                let authorities = {};
                if (this.requiredFields.active != null) {
                    authorities.active = this.activepk;
                }
                let account = await blockchain.verifyAccount(this.adress, authorities);
                return {
                    account: {
                        accountName: this.adress,
                        accountID: account.id,
                        chain: this.selectedChain,
                        keys: authorities
                    }
                };
            },
            getAccountEvent: async function() {
                let account = await this._verifyAccount();
                if (this.accountID !== null) {
                    return [account];
                } else {
                    throw "This shouldn't happen!"
                }
            }
        }
    };
</script>