import mitt from 'mitt';
const emitter = mitt();
import store from '../store/index.js';

export default class TimeoutService {
    constructor(timeout) {
        this.timeout = timeout;
        emitter.on('keyaccess', () => {
            this.resetTimeout();
        });
        this.timer = setTimeout(this.expireKeys, this.timeout);
    }
    resetTimeout() {
        clearTimeout(this.timer);
        this.timer = setTimeout(this.expireKeys, this.timeout);
    }
    expireKeys() {
        store.dispatch('AccountStore/expireKeys');
    }
}
