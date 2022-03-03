<template>
    <div
        id="step2"
    >
        <h4 class="h4 mt-3 font-weight-bold">
            {{ $t('common.step_counter',{ 'step_no' : 2}) }}
        </h4>
        <p
            class="mb-2 font-weight-bold"
        >
            {{ $t('common.account_name', { 'chain' : selectedChain}) }}
        </p>
        <input
            id="inputAccount"
            v-model="accountname"
            type="text"
            class="form-control mb-3"
            :placeholder="$t('common.account_name', { 'chain' : selectedChain})"
            required
        >
        <p class="my-3 font-weight-normal">
            {{ $t('common.keys_cta') }}
        </p>
        <template v-if="requiredFields.memo !== null">
            <p class="mb-2 font-weight-bold">
                {{ $t('common.memo_authority') }}
            </p>
            <input
                id="inputMemo"
                v-model="memopk"
                type="password"
                class="form-control mb-3 small"
                :placeholder="$t('common.memo_authority_placeholder')"
                required
            >
        </template>
        <p class="my-3 font-weight-normal">
            {{ $t('common.use_only_for_messages_and_proof') }}
        </p>
    </div>

</template>

<script>
    import getBlockchain from "../../../lib/blockchains/blockchainFactory";

    export default {
        name: "ImportMemo",
        props: [ "selectedChain" ],
        data() {
            return {
                accountname: "",
                memopk: "",
                includeOwner: 0,
                accessType: null,
                requiredFields: null
            };
        },
        created() {
            let blockchain = getBlockchain(this.selectedChain);
            this.accessType = blockchain.getAccessType();
            this.requiredFields = blockchain.getSignUpInput();
        },
        methods: {
            _verifyAccount: async function() {
                if (this.accountname == "") {
                    throw {
                        key: "missing_account_error",
                        args: {
                            chain: this.selectedChain
                        }
                    };
                }
                let blockchain = getBlockchain(this.selectedChain);
                let authorities = {};
                if (this.requiredFields.memo != null) {
                    authorities.memo = this.memopk;
                }
                let account = await blockchain.verifyAccount(this.accountname, authorities);
                return {
                    account: {
                        accountName: this.accountname,
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
