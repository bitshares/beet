<script setup>
    import { onMounted } from "vue";
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    this.emitter.on('timeout', (data)=>{
        if(data == 'logout') {
            logout();
        }
    })

    function logout() {
        this.$store.dispatch("WalletStore/logout");
        this.$router.replace("/");
    }

    onMounted(() => {
      logger.debug("Action Bar mounted");
    });
</script>

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
              <ui-icon>query_stats</ui-icon>
            </router-link>
            <router-link
                to="/add-account"
                tag="a"
                class=" status align-self-center"
                :class="{active: $route.path=='/add-account'}"
                replace
            >
              <ui-icon>add</ui-icon>
            </router-link>
            <router-link
                to="/settings"
                tag="a"
                class=" status align-self-center"
                :class="{active: $route.path=='/settings'}"
                replace
            >
              <ui-icon>settings</ui-icon>
            </router-link>
            <a
                v-tooltip="$t('common.tooltip_lock')"
                href="#"
                class=" status align-self-center"
                @click="logout()"
            >
              <ui-icon>lock</ui-icon>
            </a>
        </div>
    </div>
</template>
