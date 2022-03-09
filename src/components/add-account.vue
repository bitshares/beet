<script setup>
    import { watch, ref, computed, onMounted, inject } from "vue";
    import { ipcRenderer } from 'electron';
    const emitter = inject('emitter');

    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });

    import Actionbar from "./actionbar";
    import ImportOptions from "./blockchains/ImportOptions";
    import EnterPassword from "./EnterPassword";

    import store from '../store/index';
    import router from '../router/index.js';
    import { blockchains } from "../config/config.js";
    import getBlockchain from "../lib/blockchains/blockchainFactory";
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    let walletname = ref("");
    let step = ref(1);
    let stepMessage = ref(t('common.step_counter', {step_no: 1}));

    watch(step, async (newVal, oldVal) => {
      if (newVal !== oldVal) {
        stepMessage.value = t('common.step_counter', {step_no: newVal});
      }
    }, {immediate: true});

    let s1c = ref("");
    let selectedChain = ref(0);
    let selectedImport = ref(0);

    let accounts_to_import = ref(null);
    let import_accounts = ref(null);
    let enterPassword = ref(null);

    onMounted(() => {
      logger.debug("Account-Add wizard Mounted");
    });

    let createNewWallet = computed(() => {
      return !store.state.WalletStore.isUnlocked;
    });

    let chainList = computed(() => {
      return Object.values(blockchains).sort((a, b) => {
          if (!!a.testnet != !!b.testnet) {
              return a.testnet ? 1 : -1;
          }
          return a.name > b.name;
      });
    });

    let selectedImportOptions = computed(() => {
      if (!selectedChain || !selectedChain.value) {
          return [];
      }

      return getBlockchain(selectedChain.value).getImportOptions();
    });

    let selectedImportOption = computed(() => {
      if (!selectedChain || !selectedChain.value) {
          return null;
      }

      let useImport = !selectedImport || !selectedImport.value
          ? selectedImportOptions.value[0]
          : selectedImport.value;

      return getBlockchain(selectedChain.value)
              .getImportOptions()
              .find(option => { return option.type == useImport.type; });
    });

    function step1() {
        step.value = 1;
    }

    function step2() {
        if (!createNewWallet) {
          step.value = 2;
          return;
        }

        if (walletname.value.trim() == "") {
            ipcRenderer.send("notify", t("common.empty_wallet_error"));
            s1c.value = "is-invalid";
            return;
        }

        // todo use WalletStore
        let wallets = JSON.parse(localStorage.getItem("wallets"));
        if (
            wallets &&
            wallets.filter(wallet => wallet.name === walletname.value.trim())
                .length > 0
        ) {
            ipcRenderer.send("notify", t("common.duplicate_wallet_error"));
            s1c.value = "is-invalid";
            return;
        } else {
            walletname.value = walletname.value.trim();
            step.value = 2;
        }
    }

    async function step3() {
        try {
            getBlockchain(selectedChain.value);
            // abstract UI concept more
            emitter.emit('getAccountEvent', true);
            emitter.on('accounts_to_import', response => {
              accounts_to_import.value = response;
            })

            if (accounts_to_import.value != null) {
                // if import accounts are filled, advance to next step.
                step.value = 3;
            }
        } catch (err) {
            _handleError(err);
        }
    }

    function _handleError(err) {
        if (err == "invalid") {
            ipcRenderer.send("notify", t("common.invalid_password"));
        } else if (err == "update_failed") {
            ipcRenderer.send("notify", t("common.update_failed"));
        } else if (err.key) {
            ipcRenderer.send("notify", t(`common.${err.key}`));
        } else {
            ipcRenderer.send("notify", err.toString());
        }
    }

    async function addAccounts() {
        if (!accounts_to_import && !accounts_to_import.value) {
          throw "No account selected!";
        }
        try {
            let password = enterPassword.value.getPassword();

            for (let i in accounts_to_import.value) {
                let account = accounts_to_import.value[i];
                if (i == 0 && createNewWallet.value) {
                    await store.dispatch("WalletStore/saveWallet", {
                        walletname: walletname.value,
                        password: password,
                        walletdata: account.account
                    });
                } else {
                    account.password = password;
                    account.walletname = walletname.value;
                    await store.dispatch("AccountStore/addAccount", account);
                }
            }
            router.replace("/");
        } catch (error) {
            console.log(error);
            _handleError(error);
        }
    }
</script>

<template>
    <div class="bottom p-0">
        <div class="content px-3">
            <h4 class="h4 mt-3 font-weight-bold">
                {{ stepMessage }}
            </h4>
            <div v-if="step == 1" id="step1">
                <template v-if="createNewWallet">
                    <p
                        v-tooltip="t('common.tooltip_friendly_cta')"
                        class="my-3 font-weight-bold"
                    >
                        {{ t('common.friendly_cta') }} &#10068;
                    </p>
                    <input
                        id="inputWallet"
                        v-model="walletname"
                        type="text"
                        class="form-control mb-3"
                        :class="s1c"
                        :placeholder="t('common.walletname_placeholder')"
                        required
                        @focus="s1c = ''"
                    >
                </template>
                <p
                    v-tooltip="t('common.tooltip_chain_cta')"
                    class="my-3 font-weight-bold"
                >
                    {{ t('common.chain_cta') }} &#10068;
                </p>
                <select
                    id="chain-select"
                    v-model="selectedChain"
                    class="form-control mb-3"
                    :class="s1c"
                    :placeholder="t('common.chain_placeholder')"
                    required
                >
                    <option selected disabled value="0">
                        {{ t('common.select_chain') }}
                    </option>
                    <option
                        v-for="chain in chainList"
                        :key="chain.identifier"
                        :value="chain.identifier"
                    >
                      <span v-if="chain.testnet">
                        Testnet: {{ chain.name }} ({{ chain.identifier }})
                      </span>
                      <span v-else>
                        {{ chain.name }} ({{ chain.identifier }})
                      </span>
                    </option>
                </select>
                <div v-if="selectedImportOptions.length > 1">
                    <p class="my-3 font-weight-bold">
                        {{ t('common.bts_importtype_cta') }}
                    </p>
                    <select
                        id="import-select"
                        v-model="selectedImport"
                        class="form-control mb-3"
                        :class="s1c"
                        :placeholder="t('common.import_placeholder')"
                        required
                    >
                        <option selected disabled value="0" key="0">
                            {{ t('common.import_placeholder') }}
                        </option>
                        <option v-for="option in selectedImportOptions" :value="option" :key="option.type">
                            {{ t(`common.${option.translate_key}`) }}
                        </option>
                    </select>
                </div>
                <div class="row">
                    <div class="col-6">
                        <router-link
                            :to="createNewWallet ? '/' : '/dashboard'"
                            tag="button"
                            class="btn btn-lg btn-secondary btn-block"
                            replace
                        >
                            {{ t('common.cancel_btn') }}
                        </router-link>
                    </div>
                    <div class="col-6">
                        <button
                            class="btn btn-lg btn-primary btn-block"
                            type="submit"
                            @click="step2"
                        >
                            {{ t('common.next_btn') }}
                        </button>
                    </div>
                </div>
            </div>
            <div v-else-if="step == 2" id="step2">
                <ImportOptions
                    v-if="selectedImportOption"
                    ref="import_accounts"
                    :chain="selectedChain"
                    :type="selectedImportOption.type"
                />

                <div class="row">
                    <div class="col-6">
                        <button
                            class="btn btn-lg btn-secondary btn-block"
                            type="submit"
                            @click="step1"
                        >
                            {{ t('common.back_btn') }}
                        </button>
                    </div>
                    <div class="col-6">
                        <button
                            class="btn btn-lg btn-primary btn-block"
                            type="submit"
                            @click="step3"
                        >
                            {{ t('common.next_btn') }}
                        </button>
                    </div>
                </div>
            </div>
            <div v-else-if="step == 3" id="step3">
                <EnterPassword
                    ref="enterPassword"
                    :get-new="createNewWallet"
                />
                <button
                    class="btn btn-lg btn-primary btn-block"
                    type="submit"
                    @click="addAccounts"
                >
                    {{ t('common.next_btn') }}
                </button>
            </div>
        </div>
        <Actionbar v-if="!createNewWallet" />
        <p v-if="createNewWallet" class="mt-2 mb-2 small">
            &copy; 2019-2022 BitShares
        </p>
    </div>
</template>
