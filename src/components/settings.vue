<template>
    <div class="bottom p-0">
        <div class="content">
            <div class="settings mt-3">
                <p class="mb-1 font-weight-bold small">
                    {{ $t('settings_lbl') }}
                </p>
                <div class="row">
                    <div class="col-10 offset-1">
                        <a
                            href="#"
                            class="btn btn-primary btn-block"
                            @click="downloadBackup"
                        >
                            Download Backup
                        </a>
                    </div>
                </div>
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
            return {};
        },
        computed: {},
        watch: {},
        created() {},
        mounted() {
            logger.debug("Settings Mounted");
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
