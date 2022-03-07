<script setup>
    import { onMounted } from "vue";
    import { ipcRenderer } from "electron";
    import RendererLogger from "../lib/RendererLogger";
    const logger = new RendererLogger();

    onMounted(() => {
      logger.debug("Main Beet frame mounted");
    });

    function openDebug() {
        ipcRenderer.send("openDebug", true);
    }

    function minimise() {
        ipcRenderer.send("minimise", true);
    }

    function close() {
        ipcRenderer.send("close", false);
    }
</script>

<template>
    <ui-grid class="container-fluid menubar">
        <ui-grid-cell columns="9">
            Beet Blockchain Companion
        </ui-grid-cell>
        <ui-grid-cell columns="3">
            <div class="frame-controls">
                <ui-button icon="pest_control" @click="openDebug()"></ui-button>
                <ui-button icon="remove" @click="minimise()"></ui-button>
                <ui-button icon="close" @click="close()"></ui-button>
            </div>
        </ui-grid-cell>
    </ui-grid>
</template>
