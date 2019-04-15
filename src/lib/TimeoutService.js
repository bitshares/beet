import store from '../store/index.js';
import { EventBus } from "./event-bus.js";

export default class TimeoutService {

    constructor(timeout) {
        this.timeout=timeout;
        EventBus.$on('keyaccess', () => { 
            this.resetTimeout();
        });
        this.timer=setTimeout(this.expireKeys,this.timeout);
    }
    resetTimeout() {
        clearTimeout(this.timer);
        this.timer=setTimeout(this.expireKeys,this.timeout);
    }
    expireKeys() {
        store.dispatch('AccountStore/expireKeys');
    }
}