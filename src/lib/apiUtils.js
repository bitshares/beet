import {ipcRenderer} from 'electron';
import store from '../store/index.js';
import {getKey} from '../../lib/SecureRemote';
import getBlockchainAPI from "../../lib/blockchains/blockchainFactory";

/*
 * @param {String} method
 * @param {Object} request
 * @param {Object||Null} error
 * @returns Error
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
          return reject(_parseReject("REQUEST_LINK", request, result));
        })
    });
}

/*
 * Relinking app to Beet wallet.
 * @param {Object} request
 * @returns {Object}
 */
 /*
export async function relinkRequest(request) {
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});

    let popupContents = {
      request: request
    };

    ipcRenderer.send('createPopup', popupContents)

    ipcRenderer.once(`popupApproved_${request.id}`, (event, result) => {

        return resolve(result);

    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _parseReject("REQUEST_LINK", request, result);
    })
    console.log('relink')
  });
}
*/

/*
 * Get the user's blockchain account details.
 * @param {Object} request
 * @returns {Object}
 */
export async function getAccount(request) {
  // identify request popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
    let popupContents = {
      request: request
    };

    ipcRenderer.send('createPopup', popupContents)

    ipcRenderer.once(`popupApproved_${request.id}`, (event, result) => {

        return resolve(result);

    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _parseReject("REQUEST_LINK", request, result);
    })
  });
}

/*
 * Prompt the user to provide their signature.
 * @param {Object} request
 * @returns {Object}
 */
 /*
export async function requestSignature(request) {
  // transaction request popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
    let popupContents = {
      request: request
    };

    ipcRenderer.send('createPopup', popupContents)

    ipcRenderer.once(`popupApproved_${request.id}`, (event, result) => {

        return resolve(result);

    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _parseReject("REQUEST_LINK", request, result);
    })
  });
}
*/

/*
 * Perform a query using an injected blockchain library
 * @param {Object} request
 * @returns {Object}
 */
/*
export async function injectedCall(request) {
  // transaction request popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
    let popupContents = {
      request: request
    };

    ipcRenderer.send('createPopup', popupContents)

    ipcRenderer.once(`popupApproved_${request.id}`, (event, result) => {

        return resolve(result);

    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _parseReject("REQUEST_LINK", request, result);
    })
  });
}
*/

/*
 * Handle vote request for specific chain.
 * @param {Object} request
 * @returns {Object}
 */
 /*
export async function voteFor(request) {
  // generic request popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});

    let payload = request.payload;

    payload.action = "vote";
    let blockchain = getBlockchainAPI(payload.chain);
    let mappedData;
    try {
      mappedData = await blockchain.mapOperationData(payload);
    } catch (error) {
      console.log(error);
      return;
    }

    payload.generic = {
        title: t("operations.vote.title"),
        message: t("operations.vote.request", {
            appName: payload.appName,
            origin: payload.origin,
            entity: mappedData.entity,
            chain: payload.chain,
            accountName: payload.account_id
        }),
        details: mappedData.description,
        acceptText: t("operations.vote.accept_btn"),
        rejectText: t("operations.vote.reject_btn")
    };
    payload.vote_id = mappedData.vote_id;

    let popupContents = {
      request: request,
      payload: payload
    };

    ipcRenderer.send('createPopup', popupContents)

    ipcRenderer.once(`popupApproved_${request.id}`, (event, result) => {





      return this.$refs.genericReqModal.show(payload, false);


        return resolve(result);

    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _parseReject("REQUEST_LINK", request, result);
    })
  });
}
*/

/*
 * Sign a message
 * @param {Object} request
 * @returns {Object}
 */
 /*
export async function signMessage(request) {
  //signed message popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
    let popupContents = {
      request: request
    };

    ipcRenderer.send('createPopup', popupContents)

    ipcRenderer.once(`popupApproved_${request.id}`, (event, result) => {

        return resolve(result);

    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _parseReject("REQUEST_LINK", request, result);
    })
  });
}
*/

/*
 * Transfer an asset to another blockchain account
 * @param {Object} request
 * @returns {Object}
 */
export async function transfer(request) {
  // transfer req popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
    let popupContents = {
      request: request,
      chain: store.getters['AccountStore/getSigningKey'](request).chain,
      accountName: store.getters['AccountStore/getSigningKey'](request).accountName
    };

    if (blockchain.supportsFeeCalculation() && chain === "BTC") {
        let activeKey;
        try {
          activeKey = await getKey(store.getters['AccountStore/getSigningKey'](props.request).keys.active)
        } catch (error) {
          console.log(error);
        }

        if (activeKey) {
          let result;
          try {
              result = await blockchain.transfer(
                  activeKey, // Can we do this without the key?
                  props.accountName,
                  to.value,
                  {
                      amount: props.request.params.amount.satoshis || props.request.params.amount.amount,
                      asset_id: props.request.params.amount.asset_id
                  },
                  props.request.params.memo,
                  false // PREVENTS SENDING!
              );
          } catch (error) {
              console.log(error);
          }

          if (result) {
              popupContents['feeInSatoshis'] = result.feeInSatoshis;
              popupContents['toSendFee'] = blockchain.format(result.feeInSatoshis);
          }
        }
    }

    ipcRenderer.send('createPopup', popupContents)

    ipcRenderer.once(`popupApproved_${request.id}`, (event, result) => {
      let blockchain = getBlockchainAPI(request.chain);

      if (!popupContents.request.params.amount) {
        popupContents.request.params.amount = popupContents.request.params.satoshis;
      }

      let signingKey;
      try {
        signingKey = await getKey(store.getters['AccountStore/getSigningKey'](props.request).keys.active)
      } catch (error) {
        return reject(_parseReject("Transfer", request, error));
      }

      let result;
      try {
        result = await blockchain.transfer(
            signingKey,
            store.getters['AccountStore/getSigningKey'](props.request).accountName,
            to.value,
            {
                amount: props.request.params.amount.satoshis || props.request.params.amount.amount,
                asset_id: props.request.params.amount.asset_id
            },
            props.request.params.memo,
        );
      } catch (error) {
        return reject(_parseReject("Transfer", request, error));
      }

      if (!result) {
        return reject(_parseReject("Transfer", request, 'No blockchain transfer result'));
      }

      store.dispatch("WalletStore/notifyUser", {notify: "request", message: 'Transaction `transfer` successfully broadcast.'});

      return resolve(result);
    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return reject(_parseReject("Transfer", request, result));
    })
  });
}

/*
 * Verify a signed message
 * @param {Object} request
 * @returns {Object}
 */
 /*
export async function verifyMessage(request) {
  //
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
    let popupContents = {
      request: request
    };

    ipcRenderer.send('createPopup', popupContents)

    ipcRenderer.once(`popupApproved_${request.id}`, (event, result) => {

        return resolve(result);

    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _parseReject("REQUEST_LINK", request, result);
    })
  });
}
*/
