import * as Actions from './Actions';
import Queue from './Queue';
import store from '../store/index.js';

var popupQ = new Queue();
export default class BeetAPI {

    static async handler(request, vueInst) {        
        if (!Object.keys(Actions).map(key => Actions[key]).includes(request.type)) return;
        let result;
        if (popupQ.isEmpty()) {
            let qresolve;
            let queued = new Promise(function (resolve) {
                qresolve = resolve
            });
            popupQ.enqueue({
                promise: queued,
                resolve: qresolve
            });
            console.log('waiting');
            let unlocked=await store.state.WalletStore.unlocked.promise;
            result = await this[request.type](request, vueInst.$children[1]);
            let finished = popupQ.dequeue();
            finished.resolve(true);
        } else {
            if (popupQ.size() > 10) {
                return {
                    id: request.id,
                    result: {
                        isError: true,
                        error: 'Too many pending requests.'
                    }
                }
            }
            let qresolve;
            let queued = new Promise(function (resolve) {
                qresolve = resolve
            });
            let previous = popupQ.tail();
            popupQ.enqueue({
                promise: queued,
                resolve: qresolve
            });
            console.log('waiting2');
            await previous.promise;
            
            console.log('waiting done');
            result = await this[request.type](request, vueInst.$children[1]);
            let finished = popupQ.dequeue();
            finished.resolve(true);
        }
        return result;
    }

    static async [Actions.GET_ACCOUNT](request, vue) {
        try {
            
            console.log(vue);
            let response = await vue.requestAccess(request.payload);
            return {
                id: request.id,
                result: response
            };
        } catch (e) {
            console.log(e);
            return e;
        }
    }

    static async [Actions.VOTE_FOR](request, vue) {
        try {
            let response = await vue.requestVote(request.payload);
            return {
                id: request.id,
                result: response
            };
        } catch (e) {
            return e;
        }
    }
    static async [Actions.REQUEST_SIGNATURE](request, vue) {
        try {
            let response = await vue.requestTx(request.payload);
            return {
                id: request.id,
                result: response
            };
        } catch (e) {

            return e;
        }
    }
}