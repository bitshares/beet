<template>
    <div class="container-fluid menubar">
        <div class="row">
            <div class="col-12 p-0 m-0">
                <div class="title">
                    Beet Blockchain Companion
                </div>
                <div class="frame-controls">
                    <span
                        class="icon-minus"
                        @click="minimise()"
                    />
                    <span
                        class="icon-cross"
                        @click="close()"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
<script>
    import { EventBus } from '../lib/event-bus.js';
    import {
        ipcRenderer,
    } from 'electron';
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    export default {
        name: "Beetframe",
        i18nOptions: { namespaces: ["common", "operations"] },
        data() {
            return {};
        },
        mounted() {
            logger.debug('Main Beet frame mounted');
        },
        methods: {
            minimise: ()=> {
                ipcRenderer.send("minimise", true);
            },
            close:()=> {
                ipcRenderer.send("close", false);
            }
        }
    };
</script>