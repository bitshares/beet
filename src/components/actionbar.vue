<script setup>
    import { onMounted, inject, ref, watch } from "vue";
    //import { useRouter, useRoute } from 'vue-router'
    import router from '../router/index.js';
    import store from '../store/index';

    const emitter = inject('emitter');

    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    function logout() {
        console.log('logout')
        store.dispatch("WalletStore/logout");
        router.replace("/");
    }

    emitter.on('timeout', (data)=>{
        if (data == 'logout') {
            logout();
        }
    })

    onMounted(() => {
      logger.debug("Action Bar mounted");
    });

    let active = ref(null);

    let items = ref([
      {
        text: 'Home'
      },
      {
        text: 'New'
      },
      {
        text: 'Settings'
      },
      {
        text: 'Logout'
      }
    ]);

    watch(active, async (newVal, oldVal) => {
      if (newVal !== oldVal) {
        if (!newVal) {
          return;
        }

        if (newVal === 0) {
          router.replace("/dashboard");
        } else  if (newVal === 1) {
          router.replace("/add-account");
        } else  if (newVal === 2) {
          router.replace("/settings");
        } else  if (newVal === 3) {
          logout()
        }
      }
    }, {immediate: true});

</script>

<template>
    <div class="container">
        <ui-tabs
          v-model="active"
          :items="items"
          stacked
        ></ui-tabs>
    </div>
</template>
