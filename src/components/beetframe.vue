<template>
    <div class="container-fluid menubar">
        <div class="row">
            <div class="col-12 p-0 m-0">
                Test
            </div>
        </div>
    </div>
</template>
<style>
    .menubar {
        background: #0a4f79;
  -webkit-app-region: drag;
    }
</style>
<script>

import { EventBus } from '../lib/event-bus.js';


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
        }
    };
</script>