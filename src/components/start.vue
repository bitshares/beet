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
      return store.state.WalletStore.walletlist;
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
            <ui-icon v-if="hasWallet">person_pin</ui-icon>
            <section :dir="null">
              <ui-select
                v-if="hasWallet"
                id="wallet-select"
                v-model="selectedWallet"
                :class="'form-control my-3 accountProvide text-left'"
                :placeholder="t('common.select_wallet')"
                label="name"
                :options="walletlist"
                track-by="id"
                @change="passincorrect=''"
              >
                Name
              </ui-select>
            </section>
            <br>
            <ui-icon v-if="hasWallet">lock</ui-icon>
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
            <ui-button
              v-if="hasWallet"
              type="submit"
              @click="unlockWallet"
              outlined
            >
              {{ t('common.unlock_cta') }}
            </ui-button>
            <p
                v-if="hasWallet"
                class="my-2 font-weight-normal"
            >
                <em>{{ t('common.origin_lbl') }}</em>
            </p>
            <div class="row">
                <div class="col-6">
                    <router-link
                        v-if="hasWallet"
                        to="/create"
                        replace
                    >
                      <ui-button outlined>
                        {{ t('common.create_cta') }}
                      </ui-button>
                    </router-link>
                </div>
                <div class="col-6">
                    <router-link
                        v-if="hasWallet"
                        to="/restore"
                        replace
                    >
                      <ui-button outlined>
                        {{ t('common.restore_cta') }}
                      </ui-button>
                    </router-link>
                </div>
            </div>
        </div>
        <p class="mt-2 mb-2 small">
            &copy; 2019-2022 BitShares
        </p>
    </div>
</template>
