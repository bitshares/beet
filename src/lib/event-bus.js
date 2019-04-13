import Vue from 'vue';
import {
    ipcRenderer,
} from 'electron';

export const EventBus = new Vue();

ipcRenderer.on('eventbus', (event,data)=> {
    EventBus.$emit(data.method, data.payload);
});
EventBus.$on('main',(data)=> {    
    ipcRenderer.send(data.method, data.payload);
});