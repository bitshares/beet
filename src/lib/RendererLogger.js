import {
    ipcRenderer,
} from 'electron';
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
        ipcRenderer.send('info', {
            level: 'log',
            data: this.serialize(msg)
        })
    }
    warning(msg) {
        ipcRenderer.send('warning', {
            level: 'log',
            data: this.serialize(msg)
        })
    }
    error(msg) {
        ipcRenderer.send('error', {
            level: 'log',
            data: this.serialize(msg)
        })
    }
    verbose(msg) {
        ipcRenderer.send('verbose', {
            level: 'log',
            data: this.serialize(msg)
        })
    }
    transient(msg) {
        ipcRenderer.send('transient', {
            level: 'log',
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
module.exports = RendererLogger;