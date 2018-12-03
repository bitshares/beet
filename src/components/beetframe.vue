<template>
    <div class="container-fluid menubar">
        <div class="row">
            <div class="col-12 p-0 m-0">
                Beet Blockchain Companion
                <div class="frame-controls">
                    <span class="icon-minus"></span>
                    <span class="icon-cross"></span>
                </div>
            </div>
        </div>
    </div>
</template>
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