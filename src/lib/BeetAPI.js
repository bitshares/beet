import {
  requestModal,
  requestSignedMessage,
  verifyMessage,
  requestTransfer,
  showAlert
} from "./modals.js";
import * as Actions from './Actions';
import store from '../store/index.js';
import RendererLogger from "./RendererLogger";
const logger = new RendererLogger();

export default class BeetAPI {

    static async handler(request) {
        if (!Object.keys(Actions).map(key => Actions[key]).includes(request.type)) {
            return {
                id: request.id,
                result: {isError: true, error: 'Request type not supported.'}
            }
        }

        if (store.state.WalletStore.isUnlocked == false) {
            showAlert(request);
            return {
                id: request.id,
                result: {isError: true,error: 'Unlock the Beet wallet and try again.'}
            }
            // prompt user to unlock wallet
        }

        //await store.state.WalletStore.unlocked.promise; // wait forever if locked?
        let result;
        try {
          result = await this[request.type](request);
        } catch (error) {
          console.log(error);
          return {
              id: request.id,
              result: {isError: true, error: 'An error occurred whilst processing your request.'}
          }
        }

        console.log("user response", result);
        return result;
    }

    static _parseReject(method, request, err) {
        if (!err.canceled) {
            console.error(err);
        }
        return {
            id: request.id,
            result: {
                isError: true,
                method: method,
                error: err.canceled ? "User rejected" : (err.error ? err.error : err)
            }
        };
    }

    static async [Actions.GET_ACCOUNT](request) {
        let response;
        try {
            //response = this.$refs.identityReqModal.show(request);
            response = await requestModal(request.payload);
        } catch (err) {
            return this._parseReject("BeetAPI.getAccount", request, err);
        }
        return {
            id: request.id,
            result: response.response
        };
    }

    static async [Actions.REQUEST_RELINK](request) {
        let response;
        try {
            response = await requestModal(request);
        } catch (e) {
            return {
                id: request.id,
                response: {
                    isLinked: false
                }
            };
        }
        return Object.assign(request, {identity: response.response});
    }

    static async [Actions.REQUEST_LINK](request) {
        let response;
        try {
            response = await requestModal(request);
        } catch (e) {
            return {
                id: request.id,
                response: {
                    isLinked: false
                }
            };
        }
        return Object.assign(request, {identity: response.response});
    }

    static async [Actions.VOTE_FOR](request) {
        let response;
        try {
            response = await requestVote(request.payload);
        } catch (err) {
            return this._parseReject("BeetAPI.voteFor", request, err);
        }
        return {id: request.id, result: response.response};
    }

    static async [Actions.REQUEST_SIGNATURE](request) {
        let response;
        try {
            response = await requestModal(request.payload);
        } catch (err) {
            return this._parseReject("BeetAPI.requestSignature", request, err);
        }
        return {id: request.id, result: response.response};
    }

    static async [Actions.INJECTED_CALL](request) {
        let response;
        try {
            response = await requestModal(request.payload);
        } catch (err) {
            return this._parseReject("BeetAPI.injectedCall", request, err);
        }
        return {id: request.id, result: response.response};
    }

    static async [Actions.TRANSFER](request) {
        let response;
        try {
            response = await requestModal(request.payload);
        } catch (err) {
            return this._parseReject("BeetAPI.transfer", request, err);
        }
        return {id: request.id, result: response.response};
    }

    static async [Actions.SIGN_MESSAGE](request) {
        let response;
        try {
            response = await requestSignedMessage(request.payload);
        } catch (err) {
            return this._parseReject("BeetAPI.signMessage.request", request, err);
        }

        try {
          // make sure an invalid message never leaves the house
          await verifyMessage({params: response.response});
        } catch (err) {
          return this._parseReject("BeetAPI.signMessage.verify", request, err);
        }

        return {id: request.id, result: response.response};
    }

    static async [Actions.VERIFY_MESSAGE](request) {
        let response;
        try {
            response = await verifyMessage(request.payload);
        } catch (err) {
            return this._parseReject("BeetAPI.verifyMessage", request, err);
        }
        return {id: request.id, result: response};
    }
}
