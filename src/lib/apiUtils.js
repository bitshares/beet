import {ipcRenderer} from 'electron';
import store from '../store/index.js';

/*
 * @param {String} method
 * @param {Object} request
 * @param {Object||Null} error
 * @returns Error
 *
 */
function _parseReject(method, request, error) {
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

/*
 * App requesting link to Beet wallet. Create window, wait for response.
 * @param {Object} request
 * @returns {Object}
 */
export async function linkRequest(request) {
    return new Promise(async (resolve, reject) => {
        store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});

        let accounts = [];
        try {
          //accounts = store.getters['AccountStore/getAccountList'];
          accounts = JSON.parse(JSON.stringify(store.state.AccountStore.accountlist));
        } catch (error) {
          console.log(error);
          return reject(error);
        }

        let existingLinks;
        try {
          existingLinks = store.state.OriginStore.apps.filter((x) => {
              return x.appName == request.appName
                && x.origin == request.origin
                && request.chain == "ANY" || x.chain == request.chain
          })
        } catch (error) {
          console.log(error);
          existingLinks = [];
        }

        let popupContents = {
          request: request,
          accounts: accounts.map(account => {
            return {
              accountID: account.accountID,
              accountName: account.accountName,
              chain: account.chain
            };
          }),
          existingLinks: existingLinks ?? []
        };

        ipcRenderer.send('createPopup', popupContents)

        ipcRenderer.once(`popupApproved_${request.id}`, (event, result) => {
            store.dispatch("AccountStore/selectAccount", result.response);

            if (result.whitelisted) {
                store.dispatch(
                    "WhitelistStore/addWhitelist",
                    {
                        identityhash: request.identityhash,
                        method: "LinkRequestPopup"
                    }
                );
            }

            return resolve(result);
        })

        ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
          return _parseReject("REQUEST_LINK", request, result);
        })
    });
}

/*
 * Relinking app to Beet wallet.
 * @param {Object} request
 * @returns {Object}
 */
export async function relinkRequest(request) {
  console.log('relink')
}
