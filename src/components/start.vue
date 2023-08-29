<script setup>
    import { ref, onMounted, computed } from 'vue';
    import {ipcRenderer} from 'electron';

    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });

    import store from '../store/index';
    import router from '../router/index.js';
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    let hasWallet = computed(() => {
        return store.getters['WalletStore/getHasWallet'];
    })

    let walletlist = computed(() => {
        return store.getters['WalletStore/getWalletList'];
    })

    let walletOptions = computed(() => {
        let wallets = store.getters['WalletStore/getWalletList'];

        return wallets.map((wallet, i) => {
            return {label: wallet.name, value: i}
        });
    })

    let walletpass = ref("");
    let selectedWallet = ref(0);
    let passincorrect = ref("");
    let legacy = ref(false);

    onMounted(() => {
        logger.debug("Start screen mounted");
        store.dispatch("WalletStore/loadWallets", {}).catch(() => {});
        store.dispatch("OriginStore/loadApps");
    });

    function unlockWallet() {
        store
            .dispatch("WalletStore/getWallet", {
                wallet_id: walletlist.value[selectedWallet.value].id,
                wallet_pass: walletpass.value,
                legacy: legacy.value
            })
            .then(async () => {
                try {
                    await store.dispatch("WalletStore/confirmUnlock");
                } catch (error) {
                    console.log(error);
                }
                walletpass.value = "";
                router.replace("/dashboard");
            })
            .catch(() => {
                passincorrect.value = "is-invalid";
                ipcRenderer.send(
                    "notify",
                    t('common.start.invalid_password')
                );
            });
    }
</script>

<template>
    <div class="bottom">
        <div class="content">
            <p
                v-if="!hasWallet"
                class="mt-3 mb-3 font-weight-normal"
            >
                <em>{{ t('common.no_wallet') }}</em>
            </p>

            <router-link
                v-if="!hasWallet"
                to="/create"
                replace
            >
                <ui-button raised>
                    {{ t('common.start_cta') }}
                </ui-button>
            </router-link>

            <p
                v-if="!hasWallet"
                class="my-2 font-weight-normal"
            >
                <em>{{ t('common.restore_lbl') }}</em>
            </p>

            <router-link
                v-if="!hasWallet"
                to="/restore"
                replace
            >
                <ui-button raised>
                    {{ t('common.restore_cta') }}
                </ui-button>
            </router-link>
            <section :dir="null">
                <ui-select
                    v-if="hasWallet"
                    id="wallet-select"
                    v-model="selectedWallet"
                    style="width:100%"
                    :options="walletOptions"
                    full-bleed
                    @change="passincorrect=''"
                >
                    {{ t('common.start.wallet_name') }}
                </ui-select>
            </section>
            <input
                v-if="hasWallet"
                id="inputPassword"
                v-model="walletpass"
                style="width:97%; margin-top: 5px;"
                type="password"
                class="form-control mb-4 px-3"
                :placeholder=" t('common.password_placeholder')"
                required
                :class="passincorrect"
                @focus="passincorrect=''"
            >
            <ui-form-field>
                <ui-checkbox v-model="legacy" />
                <label>Legacy account</label>
            </ui-form-field>
            <br>
            <ui-button
                v-if="hasWallet"
                type="submit"
                raised
                @click="unlockWallet"
            >
                {{ t('common.unlock_cta') }}
            </ui-button>

            <ui-divider class="divider" />

            <router-link
                v-if="hasWallet"
                to="/create"
                replace
            >
                <ui-button
                    class="step_btn"
                    raised
                >
                    {{ t('common.create_cta') }}
                </ui-button>
            </router-link>
            <router-link
                v-if="hasWallet"
                to="/restore"
                replace
            >
                <ui-button
                    class="step_btn"
                    raised
                >
                    {{ t('common.restore_cta') }}
                </ui-button>
            </router-link>
        </div>
        <p class="mt-2 mb-2 small">
            &copy; 2019-2023 BitShares
        </p>
    </div>
</template>
