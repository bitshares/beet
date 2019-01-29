import * as Actions from './Actions';
import Queue from './Queue';
import store from '../store/index.js';
/*
import RendererLogger from "./RendererLogger";
const logger = new RendererLogger();
*/
var popupQ = new Queue();
export default class BeetAPI {

    static async handler(request, vueInst) {
        if (!Object.keys(Actions).map(key => Actions[key]).includes(request.type)) {
            return {
                id: request.id,
                result: {
                    isError: true,
                    error: 'Request type not supported.'
                }
            }
        }
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
            if (store.state.WalletStore.isUnlocked == false) {
                vueInst.$refs.popupComp.showAlert(request);
            }
            await store.state.WalletStore.unlocked.promise;
            result = await this[request.type](request, vueInst.$refs.popupComp);
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
            if (store.state.WalletStore.isUnlocked == false) {
                vueInst.$refs.popupComp.showAlert('Please unlock');
            }

            await previous.promise;

            result = await this[request.type](request, vueInst.$refs.popupComp);
            let finished = popupQ.dequeue();
            finished.resolve(true);
        }
        return result;
    }

    static async [Actions.GET_ACCOUNT](request, vue) {
        try {
            let response = await vue.requestAccess(request.payload);
            return {
                id: request.id,
                result: response
            };
        } catch (e) {
            return e;
        }
    }
    static async [Actions.REQUEST_LINK](request, vue) {
        try {
            let response = await vue.requestAccess(request);
            return Object.assign(request, {
                identity: response
            });
        } catch (e) {
            return {
                id: request.id,
                response: {
                    isLinked: false
                }
            };
        }
    }
    static async [Actions.VOTE_FOR](request, vue) {
        try {
            console.log("BeetAPI.voteFor", request);
            let response = await vue.requestVote(request.payload);
            return {
                id: request.id,
                result: response
            };
        } catch (err) {
            return {
                id: request.id,
                result: {
                    isError: true,
                    error: "User rejected"
                }
            };
        }
    }
    static async [Actions.REQUEST_SIGNATURE](request, vue) {
        try {
            console.log("BeetAPI.requestSignature", request);
            let response = await vue.requestTx(request.payload);
            return {
                id: request.id,
                result: response
            };
        } catch (err) {
            return {
                id: request.id,
                result: {
                    isError: true,
                    error: "User rejected"
                }
            };
        }
    }
}