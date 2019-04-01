<template>
    <div>
        <p
            v-b-tooltip.hover
            :title="$t('tooltip_password_cta')"
            class="mb-2 font-weight-bold"
        >
            {{ $t(getNew ? 'password_cta' : 'unlock_with_password_cta') }} &#10068;
        </p>
        <input
            id="inputPass"
            v-model="password"
            type="password"
            class="form-control mb-3"
            :placeholder="$t('password_placeholder')"
            required
        >
        <template v-if="getNew">
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
                required
            >
        </template>
    </div>
</template>

<script>
    import Password from "vue-password-strength-meter";
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    export default {
        name: "EnterPassword",
        i18nOptions: { namespaces: "common" },
        components: { Password },
        props: {
            getNew: {
                type: Boolean,
                required: false,
                default: false
            }
        },
        data() {
            return {
                password: "",
                confirmPassword: ""
            };
        },
        mounted() {
            logger.debug("Account-Add wizard Mounted");
        },
        methods: {
            getPassword: function() {
                if (
                    this.password == "" ||
                    (this.password != this.confirmPassword && this.new)
                ) {
                    throw { key: "confirm_pass_error" };
                }
                return this.password;
            }
        }
    };
</script>