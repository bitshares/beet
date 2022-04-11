import {ipcRenderer} from 'electron';
import store from '../store/index.js';
import {getKey} from './SecureRemote';
import getBlockchainAPI from "./blockchains/blockchainFactory";

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
          //accounts = JSON.parse(JSON.stringify(store.state.AccountStore.accountlist));
          accounts = store.getters['AccountStore/getSafeAccountList'];
        } catch (error) {
          console.log(error);
          return reject(error);
        }

        let existingLinks = [];
        try {
          existingLinks = store.state.OriginStore.apps.filter((x) => {
              return x.appName == request.appName
                && x.origin == request.origin
                && request.chain == "ANY" || x.chain == request.chain
          })
        } catch (error) {
          console.log(error);
        }

        let popupContents = {
          request: request,
          accounts: accounts,
          existingLinks: existingLinks
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
export async function relinkRequest(request) {
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});

    let shownBeetApp = store.state.OriginStore.apps.filter(
        x => x.identityhash == request.payload.identityhash
    )[0];

    let account = store.getters['AccountStore/getSafeAccountList'].filter(
        x => x.accountID == shownBeetApp.accountID && x.chain == shownBeetApp.chain
    )[0];

    ipcRenderer.send(
      'createPopup',
      {
        request: request,
        accounts: [account]
      }
    )

    ipcRenderer.once(`popupApproved_${request.id}`, (event, result) => {
        return resolve(result);
    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
        return _parseReject("REQUEST_RELINK", request, result);
    })
  });
}

/*
 * Get the user's blockchain account details.
 * @param {Object} request
 * @returns {Object}
 */
export async function getAccount(request) {
  // identify request popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});

    let shownBeetApp = store.state.OriginStore.apps.filter(x => {
      return x.identityhash == request.identityhash;
    })[0];

    let account = store.getters['AccountStore/getSafeAccountList'].filter(x => {
      return x.accountID == shownBeetApp.account_id && x.chain == shownBeetApp.chain;
    })[0];

    ipcRenderer.send(
      'createPopup',
      {
        request: request,
        accounts: [account]
      }
    )

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
export async function requestSignature(request) {
  // transaction request popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
    let popupContents = {
      request: request
    };

    ipcRenderer.send('createPopup', popupContents)

    ipcRenderer.once(`popupApproved_${request.id}`, async (event, result) => {

        let blockchain = getBlockchainAPI(request.chain);
        let txType = request.params[0];
        let finalResult;
        if (txType == "sign") {
            let transaction;
            try {
              transaction = await blockchain.sign(
                  request.params,
                  await getKey(store.getters['AccountStore/getSigningKey'](request).keys.active)
              );
            } catch (error) {
              return reject(_parseReject("sigReq", request, error));
            }
            if (transaction) {
              finalResult = transaction.toObject();
            }
        } else if (txType == "broadcast") {
            try {
              finalResult = await blockchain.broadcast(request.params);
            } catch (error) {
              return reject(_parseReject("sigReq", request, error));
            }
        } else if (txType == "signAndBroadcast") {
            let transaction;
            try {
              transaction = await blockchain.sign(
                  request.params,
                  await getKey(store.getters['AccountStore/getSigningKey'](request).keys.active)
              );
            } catch (error) {
              return reject(_parseReject("sigReq", request, error));
            }

            try {
              finalResult = await blockchain.broadcast(transaction);
            } catch (error) {
              return reject(_parseReject("sigReq", request, error));
            }
        }

        if (!finalResult) {
          return reject(_parseReject("sigReq", request, 'No blockchain transfer result'));
        }

        return resolve(finalResult);

    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _parseReject("requestSignature", request, result);
    })
  });
}

/*
 * Perform a query using an injected blockchain library
 * @param {Object} request
 * @returns {Object}
 */

export async function injectedCall(request) {
  // transaction request popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
    let popupContents = {
      request: request
    };

    ipcRenderer.send('createPopup', popupContents)

    ipcRenderer.once(`popupApproved_${request.id}`, (event, result) => {

        store.dispatch("WalletStore/notifyUser", {notify: "request", message: "Transaction successfully broadcast."});
        return resolve(result);

    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _parseReject("REQUEST_LINK", request, result);
    })
  });
}

/*
 * Handle vote request for specific chain.
 * @param {Object} request
 * @returns {Object}
 */
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
      return reject();
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

    ipcRenderer.send(
      'createPopup',
      {
        request: request,
        payload: payload
      }
    )

    ipcRenderer.once(`popupApproved_${request.id}`, (event, result) => {
        function _getLinkedAccount() {
            let account = store.getters['AccountStore/getSigningKey'](props.request);
            return {
                id: account.accountID,
                name: account.accountName,
                chain: account.chain
            }
        }

        let blockchain = getBlockchainAPI(props.request.chain);

        let operation;
        try {
          operation = await blockchain.getOperation(
            request,
            _getLinkedAccount()
          );
        } catch (error) {
          console.log(error);
          return reject();
        }

        if (operation.nothingToDo) {
          return resolve({
              response: {
                  name: approvedAccount.accountName,
                  chain: approvedAccount.chain,
                  id: approvedAccount.accountID
              },
              request: {
                id: props.request.id
              }
          });
        }

        let signingKey;
        try {
          signingKey = await getKey(store.getters['AccountStore/getSigningKey'](props.request).keys.active);
        } catch (error) {
          console.log(error);
          return reject();
        }

        let transaction;
        try {
          transaction = await blockchain.sign(operation, signingKey);
        } catch (error) {
          console.log(error);
          return reject();
        }

        let broadcastResult;
        try {
          broadcastResult = await blockchain.broadcast(transaction);
        } catch (error) {
          console.log(error);
          return reject();
        }

        if (!broadcastResult) {
          return reject();
        }

        return resolve(broadcastResult);
    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return reject(_parseReject("REQUEST_LINK", request, result));
    })
  });
}

/*
 * Sign a message
 * @param {Object} request
 * @returns {Object}
 */
export async function signMessage(request) {
  //signed message popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});
    let popupContents = ;

    ipcRenderer.send('createPopup', {request: request});

    ipcRenderer.once(`popupApproved_${request.id}`, (event, result) => {

        /*
        let keys = store.getters['AccountStore/getSigningKey'](props.request).keys;

        let key;
        try {
          key = await getKey(keys.memo ?? keys.active)
        } catch (error) {
          console.log(error);
          _reject.value({ error: error });
          ipcRenderer.send("modalError", true);
        }

        let blockchain = getBlockchainAPI(props.request.chain);
        let signingKey;
        try {
          signingKey = store.getters['AccountStore/getSigningKey'](props.request).accountName;
        } catch (error) {
          console.log(error);
          _reject.value({ error: error });
          ipcRenderer.send("modalError", true);
        }

        let signedMessage;
        try {
          signedMessage = await blockchain.signMessage(key, signingKey, props.request.params);
        } catch (error) {
          console.log(error);
        }
        */

        return resolve(result);

    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return reject(_parseReject("REQUEST_LINK", request, result));
    })
  });
}

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
          let transferResult;
          try {
              transferResult = await blockchain.transfer(
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

          if (transferResult) {
              popupContents['feeInSatoshis'] = transferResult.feeInSatoshis;
              popupContents['toSendFee'] = blockchain.format(transferResult.feeInSatoshis);
          }
        }
    }

    ipcRenderer.send('createPopup', popupContents)

    ipcRenderer.once(`popupApproved_${request.id}`, async (event, result) => {
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

      let transferResult;
      try {
        transferResult = await blockchain.transfer(
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

      if (!transferResult) {
        return reject(_parseReject("Transfer", request, 'No blockchain transfer result'));
      }

      store.dispatch("WalletStore/notifyUser", {notify: "request", message: 'Transaction `transfer` successfully broadcast.'});

      return resolve(transferResult);
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
