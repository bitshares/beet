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
        <ui-grid-cell class="demo-cell" columns="12">
            <div class="title">
                Beet Blockchain Companion
            </div>
            <div class="frame-controls">
                <ui-icon-button icon="pest_control" @click="openDebug()"></ui-icon-button>
                <ui-icon-button icon="remove" @click="minimise()"></ui-icon-button>
                <ui-icon-button icon="close" @click="close()"></ui-icon-button>
            </div>
        </ui-grid-cell>
    </ui-grid>
</template>
