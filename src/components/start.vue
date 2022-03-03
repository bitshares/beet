<script setup>
    import { ref, onMounted } from 'vue';

    import RendererLogger from "../lib/RendererLogger";
    import Multiselect from "vue-multiselect";
    const logger = new RendererLogger();

    let hasWallet = computed(() => {
      return this.$store.state.WalletStore.hasWallet;
    })

    let walletlist = computed(() => {
      return this.$store.state.WalletStore.walletlist;
    })

    let walletpass = ref("");
    let selectedWallet = ref(null);
    let passincorrect = ref("");
    let errorMsg = ref("");

    onMounted(() => {
      logger.debug("Start screen mounted");
      this.$store.dispatch("WalletStore/loadWallets", {}).catch(() => {});
      this.$store.dispatch("OriginStore/loadApps");
    });

    function unlockWallet() {
        this.$store
            .dispatch("WalletStore/getWallet", {
                wallet_id: selectedWallet.value.id,
                wallet_pass: walletpass.value
            })
            .then(() => {
                this.$router.replace("/dashboard");
            })
            .catch(() => {
                passincorrect.value = "is-invalid";
                errorMsg.value = "Invalid Password.";
                this.$refs.errorModal.show();
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
                <em>{{ $t('common.no_wallet') }}</em>
            </p>
            <router-link
                v-if="!hasWallet"
                to="/create"
                replace
            >
              <ui-button outlined>
                {{ $t('common.start_cta') }}
              </ui-button>
            </router-link>
            <p
                v-if="!hasWallet"
                class="my-2 font-weight-normal"
            >
                <em>{{ $t('common.or') }}</em>
            </p>
            <router-link
                v-if="!hasWallet"
                to="/restore"
                replace
            >
              <ui-button outlined>
                {{ $t('common.restore_cta') }}
              </ui-button>
            </router-link>

            <span
                v-if="hasWallet"
                class="icon-account"
            />
            <multiselect
                v-if="hasWallet"
                id="wallet-select"
                v-model="selectedWallet"
                :class="'form-control my-3 accountProvide text-left'"
                :searchable="false"
                :placeholder="$t('common.select_wallet')"
                label="name"
                :allow-empty="false"
                :options="walletlist"
                track-by="id"
                @change="passincorrect=''"
            />
            <br>
            <span
                v-if="hasWallet"
                class="icon-lock1"
            />
            <input
                v-if="hasWallet"
                id="inputPassword"
                v-model="walletpass"
                type="password"
                class="form-control mb-4 px-3"
                :placeholder=" $t('common.password_placeholder')"
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
              {{ $t('common.unlock_cta') }}
            </ui-button>
            <p
                v-if="hasWallet"
                class="my-2 font-weight-normal"
            >
                <em>{{ $t('common.or') }}</em>
            </p>
            <div class="row">
                <div class="col-6">
                    <router-link
                        v-if="hasWallet"
                        to="/create"
                        replace
                    >
                      <ui-button outlined>
                        {{ $t('common.create_cta') }}
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
                        {{ $t('common.restore_cta') }}
                      </ui-button>
                    </router-link>
                </div>
            </div>
        </div>
        <b-modal
            id="error"
            ref="errorModal"
            centered
            hide-footer
            title="Error"
        >
            {{ errorMsg }}
        </b-modal>
        <p class="mt-2 mb-2 small">
            &copy; 2019-2022 BitShares
        </p>
    </div>
</template>
