<template>
    <div class="bottom p-0">
        <div class="content">
            <div class="settings mt-3">
                <p class="mb-1 font-weight-bold small">
                    {{ $t('settings_lbl') }}
                </p>
            </div>
        </div>
        <Actionbar />
    </div>
</template>

<script>
    import { EventBus } from "../lib/event-bus.js";
    import Actionbar from "./actionbar";
    import {remote} from "electron";
    import RendererLogger from "../lib/RendererLogger";
    import path from 'path';
    import fs from 'fs';

    const logger = new RendererLogger();

    export default {
        name: "Settings",
        i18nOptions: { namespaces: ["common"] },
        components: {Actionbar},
        data() {
            return {
                dapps: []
            };
        },
        computed: {

        },
        watch: {},
        created() {},
        mounted() {
            logger.debug("Settings Mounted");
            for (let i=0;i< this.$store.state.AccountStore.accountlist.length;i++) {
                this.dapps=this.dapps.concat(this.$store.getters['OriginStore/walletAccessibleDapps'](this.$store.state.AccountStore.accountlist[i].chain,this.$store.state.AccountStore.accountlist[i].accountId));
            }
            console.log(this.dapps);
        },
        methods: {
            downloadBackup: function () {
                const dialog=remote.dialog;
                const app=remote.app;
                let remoteUrl="backupfile";
                let toLocalPath = path.resolve(app.getPath("desktop"), path.basename(remoteUrl));
                let userChosenPath = dialog.showSaveDialog({ defaultPath: toLocalPath });
                if(userChosenPath){
                    download (remoteUrl, userChosenPath, myUrlSaveAsComplete)
                }
            }
        }
    };
</script>
