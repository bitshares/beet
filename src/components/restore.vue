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
                id="inputWallet"
                v-model="walletname"
                type="text"
                class="form-control mb-3"
                :class="s1c"
                :placeholder="$t('walletname_placeholder')"
                required
                @focus="s1c=''"
            >
            <button
                class="btn btn-lg btn-primary btn-block mt-3"
                type="submit"
                @click="restore"
            >
                {{ $t('restore_go_cta') }}
            </button>
        </div>
    </div>
</template>

<script>

    import { EventBus } from "../lib/event-bus.js";
    import {remote} from "electron";
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
                let file= document.getElementById('restoreWallet').files[0].path;
                fs.readFileSync(file, 'utf-8', (err, data) => {
                    if(err){
                        alert("An error ocurred reading the file :" + err.message);
                        return;
                    }

                    // Change how to handle the file content
                    console.log("The file content is : " + data);
                });
            }
        }
    };
</script>