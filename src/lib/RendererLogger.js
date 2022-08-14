import {ipcRenderer} from 'electron';
import util from 'util';

class RendererLogger {

    constructor() {

    }
    log(msg) {
        ipcRenderer.send('log', {
            level: 'log',
            data: this.serialize(msg)
        })
    }
    info(msg) {
        ipcRenderer.send('log', {
            level: 'info',
            data: this.serialize(msg)
        })
    }
    warning(msg) {
        ipcRenderer.send('log', {
            level: 'warning',
            data: this.serialize(msg)
        })
    }
    error(msg) {
        ipcRenderer.send('log', {
            level: 'error',
            data: this.serialize(msg)
        })
    }
    verbose(msg) {
        ipcRenderer.send('log', {
            level: 'verbose',
            data: this.serialize(msg)
        })
    }
    debug(msg) {
        ipcRenderer.send('log', {
            level: 'debug',
            data: this.serialize(msg)
        })
    }
    transient(msg) {
        ipcRenderer.send('log', {
            level: 'transient',
            data: this.serialize(msg)
        })
    }
    serialize(obj) {
        return util.inspect(obj, {
            compact: true,
            breakLength: 80,
            depth: 3
        })
    }
}
export default  RendererLogger;
