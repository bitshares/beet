<script setup>
    import { defineProps } from 'vue';
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    const props = defineProps({
      getNew: {
          type: Boolean,
          required: false,
          default: false
      }
    });

    onMounted(() => {
      logger.debug("Enter Password Mounted");
    });

    let password = "";
    let confirmPassword = "";

    function getPassword() {
        if (
            this.password == "" ||
            (this.password != this.confirmPassword && this.new)
        ) {
            throw { key: "confirm_pass_error" };
        }
        return this.password;
    }
</script>

<template>
    <div>
        <p
            v-b-tooltip.hover
            :title="$t('common.tooltip_password_cta')"
            class="mb-2 font-weight-bold"
        >
            {{ $t(getNew ? 'common.password_cta' : 'common.unlock_with_password_cta') }} &#10068;
        </p>
        <input
            id="inputPass"
            v-model="password"
            type="password"
            class="form-control mb-3"
            :placeholder="$t('common.password_placeholder')"
            required
        >
        <template v-if="getNew">
            <p class="mb-2 font-weight-bold">
                {{ $t('common.confirm_cta') }}
            </p>
            <input
                id="inputConfirmPass"
                v-model="confirmPassword"
                type="password"
                class="form-control mb-3"
                :placeholder="$t('common.confirm_placeholder')"
                required
            >
        </template>
    </div>
</template>
