<template>
    <div class="bottom p-0">
        <div class="content px-3">
            <h4 class="h4 mt-3 font-weight-bold">
                {{ $t('restore_lbl') }}
            </h4>
            <p
                v-b-tooltip.hover
                :title="$t('tooltip_backupfile_cta')"
                class="my-3 font-weight-bold"
            >
                {{ $t('backupfile_cta') }} &#10068;
            </p>
            <input
                id="restoreWallet"
                type="file"
                class="form-control mb-3"
                :placeholder="$t('backup_placeholder')"
                required
            >
            <p
                v-b-tooltip.hover
                :title="$t('tooltip_backuppass_cta')"
                class="my-3 font-weight-bold"
            >
                {{ $t('backuppass_cta') }} &#10068;
            </p>
            <input
                id="backupPass"
                v-model="backuppass"
                type="password"
                class="form-control mb-3"
                :placeholder="$t('password_placeholder')"
                required
            >
            <div class="row">
                <div class="col-6">
                    <router-link
                        to="/"
                        tag="button"
                        class="btn btn-lg btn-secondary btn-block mt-3"
                        replace
                    >
                        {{ $t('cancel_btn') }}
                    </router-link>
                </div>
                <div class="col-6">
                    <button
                        class="btn btn-lg btn-primary btn-block mt-3"
                        type="button"
                        @click="restore"
                    >
                        {{ $t('restore_go_cta') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>

    import { EventBus } from "../lib/event-bus.js";
    import CryptoJS from 'crypto-js';
    import RendererLogger from "../lib/RendererLogger";
    import path from 'path';
    import fs from 'fs';

    const logger = new RendererLogger();

    export default {
        name: "Restore",
        components: {  },
        i18nOptions: { namespaces: "common" },
        data() {
            return {
                walletfile: "",
                backuppass: ""
            };
        },
        computed: {
        },
        mounted() {
            logger.debug("Restore wizard Mounted");
        },
        methods: {
            restore: function() {
                document.getElementById('restoreWallet').classList.remove("error");
                document.getElementById('backupPass').classList.remove("error");
                if ( document.getElementById('restoreWallet').files[0]) {
                    if (this.backuppass!="") {
                        let file= document.getElementById('restoreWallet').files[0].path;

                        EventBus.$emit("popup", "load-start");
                        fs.readFile(file, 'utf-8', async (err, data) => {
                            if(err){
                                alert("An error ocurred reading the file :" + err.message);
                                EventBus.$emit("popup", "load-end");
                                return;
                            }
                            try {
                                let wallet=JSON.parse(CryptoJS.AES.decrypt(data, this.backuppass).toString(CryptoJS.enc.Utf8));
                                await this.$store.dispatch('WalletStore/restoreWallet', { backup: wallet, password: this.backuppass});
                                EventBus.$emit("popup", "load-end");
                                this.$router.replace("/");
                            }catch(e) {
                                //Wrong  Password
                                EventBus.$emit("popup", "load-end");
                            }
                        });
                    }else{
                        document.getElementById('backupPass').classList.add("error");
                    }
                }else{
                    document.getElementById('restoreWallet').classList.add("error");
                }
            }
        }
    };
</script>
