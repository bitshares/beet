<template>
    <div>
        <b-modal
            id="linkRequest"
            ref="linkReqModal"
            centered
            no-close-on-esc
            no-close-on-backdrop
            hide-header-close
            hide-footer
            :title="$t('link_request')"
        >
            {{ this.$data.genericmsg }}:
            <br>
            <br>        
        </b-modal>
        <div class="alerts">
            <b-alert variant="warning" v-bind:key="alert.id" v-for="alert in alerts" show fade dismissible v-on:dismissed="hideAlert(alert.id)">{{alert.msg}}</b-alert>            
        </div>
    </div>
</template>
<style>
    .alerts {
        position:absolute;
        left:5%;
        right:5%;
        top:2%;
        width:90%;
    }
</style>
<script>
import {
    v4 as uuidv4
} from "uuid";

    export default {
        name: "Popups",
        i18nOptions: { namespaces: "common" },        
        data() {
            return {
                genericmsg: '',
                alerts: []
            };
        },  
        watch:{
            $route (to, from){
                this.alerts = [];
            }
        },      
        methods: {
            link: async function() {
                await this.$refs.linkReqModal.show();
            },
            showAlert: function(request) { 
                let alert;
                let alertmsg; 
                switch(request.type) {
                    case 'link':
                        alertmsg=this.$t('link_alert',request);
                        alert={msg:alertmsg, id: uuidv4()};
                        break;
                    default:
                        console.log(request.payload);
                        alertmsg=this.$t('access_alert',request.payload);
                        alert={msg:alertmsg, id: uuidv4()};
                        break;
                }
                //let alert={msg:msg, id: uuidv4()};
                this.alerts.push(alert);
            },
            hideAlert: function(id) {
                let index = this.alerts.findIndex(function(o){
                    return o.id === id;
                })
                if (index !== -1) this.alerts.splice(index, 1);
            }
        }
    };
</script>