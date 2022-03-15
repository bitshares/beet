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
      return store.state.WalletStore.hasWallet;
    })

    let walletlist = computed(() => {
      return store.state.WalletStore.walletlist.map(wallet => {
        return {label: wallet.name, value: wallet}
      });
    })

    let walletpass = ref("");
    let selectedWallet = ref(null);
    let passincorrect = ref("");

    onMounted(() => {
      logger.debug("Start screen mounted");
      store.dispatch("WalletStore/loadWallets", {}).catch(() => {});
      store.dispatch("OriginStore/loadApps");
    });

    function unlockWallet() {
        store
        .dispatch("WalletStore/getWallet", {
            wallet_id: selectedWallet.value.id,
            wallet_pass: walletpass.value
        })
        .then(() => {
            router.replace("/dashboard");
        })
        .catch(() => {
            passincorrect.value = "is-invalid";
            ipcRenderer.send("notify", 'An attempt to unlock the Beet wallet was made with an invalid password.');
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

            <br/>
            <section :dir="null">
              <ui-select
                v-if="hasWallet"
                id="wallet-select"
                v-model="selectedWallet"
                :options="walletlist"
                @change="passincorrect=''"
              >
                Name
              </ui-select>
            </section>
            <br/>
            <input
                v-if="hasWallet"
                id="inputPassword"
                v-model="walletpass"
                type="password"
                class="form-control mb-4 px-3"
                :placeholder=" t('common.password_placeholder')"
                required
                :class="passincorrect"
                @focus="passincorrect=''"
            >
            <br/>
            <br/>
            <ui-button
              v-if="hasWallet"
              type="submit"
              @click="unlockWallet"
              outlined
            >
              {{ t('common.unlock_cta') }}
            </ui-button>

            <ui-divider class="divider"></ui-divider>

            <router-link
                v-if="hasWallet"
                to="/create"
                replace
            >
              <ui-button class="step_btn" outlined>
                {{ t('common.create_cta') }}
              </ui-button>
            </router-link>
            <router-link
                v-if="hasWallet"
                to="/restore"
                replace
            >
              <ui-button class="step_btn" outlined>
                {{ t('common.restore_cta') }}
              </ui-button>
            </router-link>
        </div>
        <p class="mt-2 mb-2 small">
            &copy; 2019-2022 BitShares
        </p>
    </div>
</template>
