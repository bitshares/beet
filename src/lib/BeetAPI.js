import {
  requestModal,
  requestSignedMessage,
  verifyMessage,
  requestTransfer,
  showAlert
} from "./modals.js";
import {ipcRenderer} from 'electron';
import * as Actions from './Actions';
import store from '../store/index.js';
import RendererLogger from "./RendererLogger";
const logger = new RendererLogger();

export default class BeetAPI {

    static async handler(request) {
        if (!Object.keys(Actions).map(key => Actions[key]).includes(request.type)) {
            throw {
                id: request.id,
                result: {isError: true, error: 'Request type not supported.'}
            }
        }

        if (store.state.WalletStore.isUnlocked == false) {
            showAlert(request); // prompt user to unlock wallet
            throw {
                id: request.id,
                result: {isError: true, error: 'Unlock the Beet wallet and try again.'}
            }
        }

        //await store.state.WalletStore.unlocked.promise; // wait forever if locked?
        let result;
        try {
          result = await this[request.type](request);
        } catch (error) {
          console.log(error);
          throw {
              id: request.id,
              result: {isError: true, error: 'An error occurred whilst processing your request.'}
          }
        }

        return result;
    }

    static _parseReject(method, request, error) {
        if (!error.canceled) {
            console.error(error);
        }
        throw {
            id: request.id,
            result: {
                isError: true,
                method: method,
                error: error.canceled ? "User rejected" : (error.error ? error.error : error)
            }
        };
    }

    static async [Actions.GET_ACCOUNT](request) {
        ipcRenderer.invoke('createPopup', request.payload).then((result) => {
          // ...
          return {
              id: request.id,
              result: response.response
          };
        }).catch((error) => {
          return this._parseReject("BeetAPI.getAccount", request, error);
        })
    }

    static async [Actions.REQUEST_LINK](request) {

        ipcRenderer.invoke('createPopup', request.payload).then((result) => {
          // ...
          return {
              id: request.id,
              result: result
          };
        }).catch((error) => {
          console.log(error);
          throw {
              id: request.id,
              response: {
                  isLinked: false
              }
          };
          //return this._parseReject("BeetAPI.REQUEST_LINK", request, error);
        })
    }

    static async [Actions.REQUEST_RELINK](request) {
        let response;
        try {
            response = await requestModal(request.payload);
        } catch (error) {
            console.log(error)
            throw {
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
        } catch (error) {
            return this._parseReject("BeetAPI.voteFor", request, error);
        }
        return {id: request.id, result: response.response};
    }

    static async [Actions.REQUEST_SIGNATURE](request) {
        let response;
        try {
            response = await requestModal(request.payload);
        } catch (error) {
            return this._parseReject("BeetAPI.requestSignature", request, error);
        }
        return {id: request.id, result: response.response};
    }

    static async [Actions.INJECTED_CALL](request) {
        let response;
        try {
            response = await requestModal(request.payload);
        } catch (error) {
            return this._parseReject("BeetAPI.injectedCall", request, error);
        }
        return {id: request.id, result: response.response};
    }

    static async [Actions.TRANSFER](request) {
        let response;
        try {
            response = await requestModal(request.payload);
        } catch (error) {
            return this._parseReject("BeetAPI.transfer", request, error);
        }
        return {id: request.id, result: response.response};
    }

    static async [Actions.SIGN_MESSAGE](request) {
        let response;
        try {
            response = await requestSignedMessage(request.payload);
        } catch (error) {
            return this._parseReject("BeetAPI.signMessage.request", request, error);
        }

        try {
          // make sure an invalid message never leaves the house
          await verifyMessage({params: response.response});
        } catch (error) {
          return this._parseReject("BeetAPI.signMessage.verify", request, error);
        }

        return {id: request.id, result: response.response};
    }

    static async [Actions.VERIFY_MESSAGE](request) {
        let response;
        try {
            response = await verifyMessage(request.payload);
        } catch (error) {
            return this._parseReject("BeetAPI.verifyMessage", request, error);
        }
        return {id: request.id, result: response};
    }
}
