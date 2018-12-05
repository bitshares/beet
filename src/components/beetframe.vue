<template>
    <div class="container-fluid menubar">
        <div class="row">
            <div class="col-12 p-0 m-0">
                <div class="title">Beet Blockchain Companion</div>
                <div class="frame-controls">
                    <span class="icon-minus" @click="minimise()"></span>
                    <span class="icon-cross" @click="close()"></span>
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

    export default {
        name: "Beetframe",
        i18nOptions: { namespaces: ["common", "operations"] },
        data() {
            return {
                
            };
        },  
        created() {
            
        },
        watch:{
            
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