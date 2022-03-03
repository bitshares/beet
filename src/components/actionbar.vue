<template>
    <div class="row node-selector">
        <div class="col-12 p-0 text-center d-flex justify-content-center">
            <router-link
                to="/dashboard"
                tag="a"
                class=" status align-self-center"
                :class="{active: $route.path=='/dashboard'}"
                replace
            >
                <span class="icon-stats-bars" />
            </router-link>
            <router-link
                to="/add-account"
                tag="a"
                class=" status align-self-center"
                :class="{active: $route.path=='/add-account'}"
                replace
            >
                <span class="icon-user-plus" />
            </router-link>
            <router-link
                to="/settings"
                tag="a"
                class=" status align-self-center"
                :class="{active: $route.path=='/settings'}"
                replace
            >
                <span class="icon-settings" />
            </router-link>
            <a
                v-b-tooltip.hover
                v-b-tooltip.d500
                :title="$t('common.tooltip_lock')"
                href="#"
                class=" status align-self-center"
                @click="logout()"
            >
                <span class="icon-unlock" />
            </a>
        </div>
    </div>
</template>

<script>
    import RendererLogger from "../lib/RendererLogger";
    import { EventBus } from "../lib/event-bus.js";
    const logger = new RendererLogger();

    export default {
        name: "Actionbar",
        data() {
            return {};
        },
        computed: {},
        watch: {},
        created() {
            EventBus.$on('timeout', (data)=>{
                if(data=='logout') {
                    this.logout();
                }
            })
        },
        mounted() {
            logger.debug("Action Bar mounted");
        },
        methods: {
            logout: function() {
                this.$store.dispatch("WalletStore/logout");
                this.$router.replace("/");
            }
        }
    };
</script>
