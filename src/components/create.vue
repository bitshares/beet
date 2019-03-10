<template>
    <div class="bottom ">
        <div
            v-if="step==1"
            id="step1"
        >
            <h4 class="h4 mt-3 font-weight-bold">
                {{ $t('step_counter',{ 'step_no' : 1}) }}
            </h4>
            <p
                v-b-tooltip.hover
                :title="$t('tooltip_friendly_cta')"
                class="my-3 font-weight-bold"
            >
                {{ $t('friendly_cta') }} &#10068;
            </p>
            <input
                id="inputWallet"
                v-model="walletname"
                type="text"
                class="form-control mb-3"
                :class="s1c"
                :placeholder="$t('walletname_placeholder')"
                required=""
                @focus="s1c=''"
            >
            <p
                v-b-tooltip.hover
                :title="$t('tooltip_chain_cta')"
                class="my-3 font-weight-bold"
            >
                {{ $t('chain_cta') }} &#10068;
            </p>
            <select                
                id="chain-select"
                v-model="selectedChain"
                class="form-control mb-3"
                :class="s1c"
                :placeholder="$t('chain_placeholder')"
                required
            >
                <option
                    selected
                    disabled
                    value="0"
                >
                    {{ $t('select_chain') }}
                </option>
                <option
                    v-for="chain in chainList"
                    :key="chain.short"
                    :value="chain.short"
                >
                    {{ chain.name }} ({{ chain.short }})
                </option>
            </select>
            <div v-if="selectedChain=='BTS'">
                <p class="my-3 font-weight-bold">
                    {{ $t('bts_importtype_cta') }}
                </p>
                <select
                    id="import-select"
                    v-model="BTSImportType"
                    class="form-control mb-3"
                    :class="s1c"
                    :placeholder="$t('import_placeholder')"
                    required
                >
                    <option
                        selected
                        disabled
                        value="0"
                    >
                        {{ $t('import_placeholder') }}
                    </option>
                    <option
                        value="1"
                    >
                        {{ $t('import_keys') }}
                    </option>
                    <option
                        value="2"
                    >
                        {{ $t('import_pass') }}
                    </option>                
                    <option
                        value="3"
                    >
                        {{ $t('import_bin') }}
                    </option>
                </select>
            </div>
            <div class="row">
                <div class="col-6">
                    <router-link
                        to="/"
                        tag="button"
                        class="btn btn-lg btn-primary btn-block"
                        replace
                    >
                        {{ $t('cancel_btn') }}
                    </router-link>
                </div>
                <div class="col-6">
                    <button
                        class="btn btn-lg btn-primary btn-block"
                        type="submit"
                        @click="step2"
                    >
                        {{ $t('next_btn') }}
                    </button>
                </div>
            </div>
        </div>
        <div
            v-if="step==2 && (selectedChain!='BTS' || BTSImportType=='1')"
            id="step2"
        >
            <h4 class="h4 mt-3 font-weight-bold">
                {{ $t('step_counter',{ 'step_no' : 2}) }}
            </h4>
            <p
                v-if="accessType=='account'"
                class="mb-2 font-weight-bold"
            >
                {{ $t('account_name',{ 'chain' : selectedChain}) }}
            </p>
            <p
                v-else
                class="mb-2 font-weight-bold"
            >
                {{ $t('address_name',{ 'chain' : selectedChain}) }}
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
                {{ $t('keys_cta') }}
            </p>
            <template v-if="requiredFields.active !== null">
                <p
                    v-if="accessType=='account'"
                    class="mb-2 font-weight-bold"
                >
                    {{ $t('active_authority') }}
                </p>
                <p
                    v-else
                    class="mb-2 font-weight-bold"
                >
                    {{ $t('public_authority') }}
                </p>
                <input
                    id="inputActive"
                    v-model="activepk"
                    type="password"
                    class="form-control mb-3 small"
                    :placeholder="accessType=='account' ? $t('active_authority_placeholder') : $t('public_authority_placeholder')"
                    required
                >
            </template>
            <template v-if="requiredFields.memo !== null">
                <p class="mb-2 font-weight-bold">
                    {{ $t('memo_authority') }}
                </p>
                <input
                    id="inputMemo"
                    v-model="memopk"
                    type="password"
                    class="form-control mb-3 small"
                    :placeholder="$t('memo_authority_placeholder')"
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
                    {{ $t('include_owner_check') }}
                </b-form-checkbox>
                <div v-if="includeOwner==1">
                    <input
                        id="inputOwner"
                        v-model="ownerpk"
                        type="password"
                        class="form-control mb-3 small"
                        :placeholder="$t('owner_authority_placeholder')"
                        required
                    >
                </div>
            </template>
            <div class="row">
                <div class="col-6">
                    <button
                        class="btn btn-lg btn-primary btn-block"
                        type="submit"
                        @click="step1"
                    >
                        {{ $t('back_btn') }}
                    </button>
                </div>
                <div class="col-6">
                    <button
                        class="btn btn-lg btn-primary btn-block"
                        type="submit"
                        @click="step3"
                    >
                        {{ $t('next_btn') }}
                    </button>
                </div>
            </div>
        </div>
        <div
            v-if="step==2 && selectedChain=='BTS' && BTSImportType=='2'"
            id="step2"
        >
            <h4 class="h4 mt-3 font-weight-bold">
                {{ $t('step_counter',{ 'step_no' : 2}) }}
            </h4>
            <p
                v-if="accessType=='account'"
                class="mb-2 font-weight-bold"
            >
                {{ $t('account_name',{ 'chain' : selectedChain}) }}
            </p>
            <p
                v-else
                class="mb-2 font-weight-bold"
            >
                {{ $t('address_name',{ 'chain' : selectedChain}) }}
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
                v-model="btspass"
                type="password"
                class="form-control mb-3 small"
                :placeholder="$t('btspass_placeholder')"
                required
            >
            <div class="row">
                <div class="col-6">
                    <button
                        class="btn btn-lg btn-primary btn-block"
                        type="submit"
                        @click="step1"
                    >
                        {{ $t('back_btn') }}
                    </button>
                </div>
                <div class="col-6">
                    <button
                        class="btn btn-lg btn-primary btn-block"
                        type="submit"
                        @click="step3"
                    >
                        {{ $t('next_btn') }}
                    </button>
                </div>
            </div>
        </div>
        <div
            v-if="step==2 && selectedChain=='BTS' && BTSImportType=='3'"
            id="step2"
        >
            <h4 class="h4 mt-3 font-weight-bold">
                {{ $t('step_counter',{ 'step_no' : 2}) }}
            </h4>
            <template v-if="substep1">
                <p                
                    class="mb-2 font-weight-bold"
                >
                    {{ $t('Select your .bin backup file.') }}
                </p>
                <input
                    v-if="step1"
                    type="file"
                    class="form-control mb-3 small" 
                    @change="handleWalletSelect"
                >
                <p                
                    class="mb-2 font-weight-bold"
                >
                    {{ $t('Enter your .bin file password.') }}
                </p>
                <input
                    v-model="wallet_pass"
                    type="password"
                    class="form-control mb-3 small"
                >
                <div class="row">
                    <div class="col-6">
                        <button
                            class="btn btn-lg btn-primary btn-block"
                            type="submit"
                            @click="step1"
                        >
                            {{ $t('back_btn') }}
                        </button>
                    </div>
                    <div class="col-6">
                        <button
                            class="btn btn-lg btn-primary btn-block"
                            type="submit"
                            @click="decryptBackup"
                        >
                            {{ $t('next_btn') }}
                        </button>
                    </div>
                </div>
            </template>
            <template v-if="substep2">
                <div class="import-accounts mt-3">
                    <table class="table small table-striped table-sm">
                        <thead>
                            <tr>                    
                                <th
                                    rowspan="2"
                                    class="align-middle"
                                >
                                    Account Name
                                </th>
                                <th
                                    colspan="2"
                                    class="align-middle"
                                >
                                    Active Authority
                                </th>
                                <th
                                    colspan="2"
                                    class="align-middle"
                                >
                                    Owner Authority
                                </th>
                                <th
                                    rowspan="2"
                                    class="align-middle"
                                >
                                    Memo
                                </th>
                                <th
                                    rowspan="2"
                                    class="align-middle"
                                >
                                    Import?
                                </th>
                            </tr>                
                            <tr>
                                <th class="align-middle">
                                    Propose
                                </th>
                                <th class="align-middle">
                                    Transact
                                </th>
                                <th class="align-middle">
                                    Propose
                                </th>
                                <th class="align-middle">
                                    Transact
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="account in accounts" 
                                :key="account.id"
                                :class="{ disabledImport : !account.importable}"
                            >                    
                                <td class="text-center align-middle">
                                    {{ account.name }}<br>({{ account.id }})
                                </td>
                                <td class="text-center align-middle">
                                    {{ account.active.canPropose ? 'Y' : 'N' }}
                                </td>
                                <td class="text-center align-middle">
                                    {{ account.active.canTransact ? 'Y' : 'N' }}
                                </td>
                                <td class="text-center align-middle">
                                    {{ account.owner.canPropose ? 'Y' : 'N' }}
                                </td>
                                <td class="text-center align-middle">
                                    {{ account.owner.canTransact ? 'Y' : 'N' }}
                                </td>
                                <td class="text-center align-middle">
                                    {{ account.memo.canSend ? 'Y' : 'N' }}
                                </td>
                                <td class="text-center align-middle">
                                    <input
                                        v-if="account.importable"
                                        :id="account.name"
                                        v-model="picked"
                                        type="checkbox"
                                        :value="account.id"
                                    >
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <button
                    v-if="picked.length>0"
                    class="btn btn-lg btn-primary btn-block mt-3"
                    @click="simpleStep3"
                >
                    {{ $t('import_btn') }}
                </button>
            </template>
        </div>
        <div
            v-if="step==3"
            id="step3"
        >
            <h4 class="h4 mt-3 font-weight-bold">
                {{ $t('step_counter',{ 'step_no' : 3}) }}
            </h4>
            <p
                v-b-tooltip.hover
                :title="$t('tooltip_password_cta')"
                class="mb-2 font-weight-bold"
            >
                {{ $t('password_cta') }} &#10068;
            </p>
            <input
                id="inputPass"
                v-model="password"
                type="password"
                class="form-control mb-3"
                :placeholder="$t('password_placeholder')"
                required
            >
            <password
                v-model="password"
                :secure-length="12"
                :strength-meter-only="true"
            />
            <p class="mb-2 font-weight-bold">
                {{ $t('confirm_cta') }}
            </p>
            <input
                id="inputConfirmPass"
                v-model="confirmpassword"
                type="password"
                class="form-control mb-3"
                :placeholder="$t('confirm_placeholder')"
                required=""
            >
            <button
                v-if="BTSImportType!='3'"
                class="btn btn-lg btn-primary btn-block"
                type="submit"
                @click="verifyAndCreate"
            >
                {{ $t('next_btn') }}
            </button>
            <button
                v-if="BTSImportType=='3'"
                class="btn btn-lg btn-primary btn-block"
                type="submit"
                @click="importAccounts"
            >
                {{ $t('next_btn') }}
            </button>
        </div>
        <b-modal
            id="error"
            ref="errorModal"
            centered
            hide-footer
            :title="$t('error_lbl')"
        >
            {{ errorMsg }}
        </b-modal>
        <p class="mt-2 mb-2 small">
            &copy; 2019 BitShares
        </p>
    </div>
</template>

<script>
    import Password from 'vue-password-strength-meter'
    import { blockchains } from "../config/config.js";
    import getBlockchain from "../lib/blockchains/blockchainFactory";
    import { EventBus } from "../lib/event-bus.js";
    import RendererLogger from "../lib/RendererLogger";
    import {PrivateKey} from "bitsharesjs";
    import BTSWalletHandler from "../lib/BTSWalletHandler";

    const logger = new RendererLogger();

    export default {
        name: "Create",
        i18nOptions: { namespaces: "common" },
        components: { Password },
        data() {
            return {
                walletname: "",
                accountname: "",
                accountID: "",
                activepk: "",
                ownerpk: "",
                memopk: "",
                password: "",
                confirmpassword: "",
                step: 1,
                substep1: true,
                substep2:false,
                s1c: "",
                btspass: "",
                includeOwner: 0,
                errorMsg: "",
                selectedChain: 0,
                BTSImportType: 0,
                chainList: Object.values(blockchains),
                wallet_file: null,
                wallet_pass: null,
                accounts:[],
                picked:[]
            };
        },
        mounted() {
            logger.debug('Create Wallet Wizard mounted');
        },
        methods: {
            step1: function() {
                this.step = 1;
            },
            step2: function() {
                if (this.walletname.trim() == "") {
                    this.errorMsg = this.$t("empty_wallet_error");
                    this.$refs.errorModal.show();
                    this.s1c = "is-invalid";
                } else {
                    let wallets = JSON.parse(localStorage.getItem("wallets"));

                    if (
                        wallets &&
                        wallets.filter(wallet => wallet.name === this.walletname.trim())
                            .length > 0
                    ) {
                        this.errorMsg = this.$t("duplicate_wallet_error");
                        this.$refs.errorModal.show();
                        this.s1c = "is-invalid";
                    } else {
                        this.walletname = this.walletname.trim();
                        this.step = 2;
                    }
                }
                if (this.selectedChain!=0) {
                    if (this.selectedChain!='BTS' || this.BTSImportType!=0) {
                        let blockchain = getBlockchain(this.selectedChain);
                        this.accessType = blockchain.getAccessType();
                        this.requiredFields = blockchain.getSignUpInput();
                    }
                }
            },
            simpleStep3: function () {
                this.step=3;
            },
            step3: async function() {
                if (this.accountname == "") {
                    this.errorMsg = this.$t("missing_account_error", {
                        chain: this.selectedChain
                    });
                    this.$refs.errorModal.show();
                    return;
                }

                EventBus.$emit("popup", "load-start");
                try {
                    let blockchain = getBlockchain(this.selectedChain);
                    // abstract UI concept more
                    let authorities = null;
                    let account=null;
                    if (blockchain.getAccessType() == "account") {
                        if (this.BTSImportType==2){
                            authorities = this.getAuthoritiesFromPass(this.btspass);
                            try {
                                account = await blockchain.verifyAccount(this.accountname, authorities);
                            }catch(e)  {
                                authorities = this.getAuthoritiesFromPass(this.btspass,true);
                                account = await blockchain.verifyAccount(this.accountname, authorities);
                                //TODO: Should notify user of legacy/dangerous permissions (active==memo)
                            }
                        }else{ 
                            authorities = {
                                active: this.activepk,
                                memo: this.memopk,
                                owner: this.includeOwner == 1 ? this.ownerpk : null
                            };
                            account = await blockchain.verifyAccount(this.accountname, authorities);
                        }
                    } else {
                        authorities = {
                            active: this.activepk
                        };                    
                        blockchain.verifyAccount(this.accountname, authorities);
                    }
                    EventBus.$emit("popup", "load-end");
                    this.accountID = account.id;
                    this.step = 3;
                } catch (err) {
                    this.accountID = "";
                    if (err.key) {
                        this.errorMsg = this.$t(err.key);
                    } else {
                        this.errorMsg = err.toString();
                    }
                    this.$refs.errorModal.show();
                } finally {
                    EventBus.$emit("popup", "load-end");
                }
            },
            getAuthoritiesFromPass: function(password,legacy=false) {
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
            handleWalletSelect: function(e) {
                this.wallet_file=e.target.files[0];
            },
            decryptBackup: function() {
                EventBus.$emit("popup", "load-start");
                let reader = new FileReader();
                reader.onload = async evt => {
                    let wh=new BTSWalletHandler(evt.target.result);
                    try {
                        let unlocked=await wh.unlock(this.wallet_pass);
                        if (unlocked) {
                            this.accounts=await wh.lookupAccounts();
                            console.log(this.accounts);
                            this.substep1=false;
                            this.substep2=true;
                            EventBus.$emit("popup", "load-end");
                        }
                    }catch(err) {
                        if (err.key) {
                            this.errorMsg = this.$t(err.key);
                        } else {
                            this.errorMsg = err.toString();
                        }
                        console.log(err);
                        this.$refs.errorModal.show();
                    }finally {
                        EventBus.$emit("popup", "load-end");
                    }
                };
                reader.readAsBinaryString(this.wallet_file);
            },
            importAccounts: async function() {
                if (this.password != this.confirmpassword || this.password == "") {
                    this.$refs.errorModal.show();
                    this.errorMsg = this.$t("confirm_pass_error");
                    return;
                }
                
                EventBus.$emit("popup", "load-start");
                let toimport=this.accounts.filter(x => this.picked.includes(x.id));                
                for (let i in toimport) {
                    let account=toimport[i];
                    if (i==0) {
                        await this.$store.dispatch("WalletStore/saveWallet", {
                            walletname: this.walletname,
                            password: this.password,
                            walletdata: {
                                accountName: account.name,
                                accountID: account.id,
                                chain: this.selectedChain,
                                keys: {
                                    active: account.active.key,
                                    owner: account.owner.key,
                                    memo: account.memo.key
                                }
                            }
                        });
                    }else{
                        await  this.$store
                            .dispatch("AccountStore/addAccount", {
                                password: this.password,
                                account: {
                                    accountName: account.name,
                                    accountID: account.id,
                                    chain: this.selectedChain,
                                    keys: {
                                        active: account.active.key,
                                        owner: account.owner.key,
                                        memo: account.memo.key
                                    }
                                }
                            });
                    }
                }
                this.$router.replace("/dashboard");
            },
            verifyAndCreate: async function() {
                if (this.password != this.confirmpassword || this.password == "") {
                    this.$refs.errorModal.show();
                    this.errorMsg = this.$t("confirm_pass_error");
                    return;
                }

                EventBus.$emit("popup", "load-start");

                if (this.accountID !== null) {
                    this.$store.dispatch("WalletStore/saveWallet", {
                        walletname: this.walletname,
                        password: this.password,
                        walletdata: {
                            accountName: this.accountname,
                            accountID: this.accountID,
                            chain: this.selectedChain,
                            keys: {
                                active: this.activepk,
                                owner: this.ownerpk,
                                memo: this.memopk
                            }
                        }
                    }).then(() => {
                        this.$router.replace("/dashboard");
                    });
                }
            }
        }
    };
</script>