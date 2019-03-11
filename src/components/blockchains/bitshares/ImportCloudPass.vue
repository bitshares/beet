<template>
    <div
        id="step2"
    >
        <h4 class="h4 mt-3 font-weight-bold">
            {{ $t('step_counter', { 'step_no' : 2}) }}
        </h4>
        <p
                class="mb-2 font-weight-bold"
        >
            {{ $t('account_name', { 'chain' : selectedChain}) }}
        </p>
        <input
                id="inputAccount"
                v-model="accountname"
                type="text"
                class="form-control mb-3"
                :placeholder="$t('account_name',{ 'chain' : selectedChain})"
                required
        >
        <p class="my-3 font-weight-normal">
            {{ $t('btspass_cta') }}
        </p>
        <input
                id="inputActive"
                v-model="bitshares_cloud_login_password"
                type="password"
                class="form-control mb-3 small"
                :placeholder="$t('btspass_placeholder')"
                required
        >
    </div>
</template>

<script>
    import {PrivateKey} from "bitsharesjs";
    import getBlockchain from "../../../lib/blockchains/blockchainFactory";

    export default {
        name: "AddAccount",
        i18nOptions: { namespaces: "common" },
        props: [ "selectedChain"],
        data() {
            return {
                accountname: "",
                accountID: "",
                bitshares_cloud_login_password: ""
            };
        },
        mounted() {
            if (this.selectedChain != "BTS") {
                throw "Unsupported chain!";
            }
        },
        methods: {
            step3: async function() {
                if (this.accountname == "") {
                    throw {
                        key: "missing_account_error",
                        args: {
                            chain: this.selectedChain
                        }
                    };
                }
                let blockchain = getBlockchain(this.selectedChain);
                // abstract UI concept more
                let authorities = this.getAuthoritiesFromPass(this.bitshares_cloud_login_password);;
                let account = null;
                try {
                    account = await blockchain.verifyAccount(this.accountname, authorities);
                } catch (e) {
                    authorities = this.getAuthoritiesFromPass(this.bitshares_cloud_login_password, true);
                    account = await blockchain.verifyAccount(this.accountname, authorities);
                    //TODO: Should notify user of legacy/dangerous permissions (active==memo)
                }
                this.accountID = account.id;
            },
            getAuthoritiesFromPass: function(password, legacy=false) {
                let active_seed = this.accountname + 'active' + password;
                let owner_seed = this.accountname + 'owner' + password;
                let memo_seed = this.accountname + 'memo' + password;
                if (legacy) {
                    return {
                        active: PrivateKey.fromSeed(active_seed).toWif(),
                        memo: PrivateKey.fromSeed(active_seed).toWif(),
                        owner: PrivateKey.fromSeed(owner_seed).toWif()
                    };
                }else{
                    return {
                        active: PrivateKey.fromSeed(active_seed).toWif(),
                        memo: PrivateKey.fromSeed(memo_seed).toWif(),
                        owner: PrivateKey.fromSeed(owner_seed).toWif()
                    };
                }
            },
            getAccountEvent: async function() {
                if (this.password == "") {
                    this.$refs.errorModal.show();
                    throw {key: "empty_pass_error"};
                }
                if (this.accountID !== null) {
                    return {
                        password: this.password,
                        account: {
                            accountName: this.accountname,
                            accountID: this.accountID,
                            chain: this.selectedChain,
                            keys: {
                                active: this.activepk,
                                owner: this.ownerpk,
                                memo: this.memopk
                            }
                        }
                    };
                } else {
                    throw "This shouldn't happen!"
                }
            }
        }
    };
</script>