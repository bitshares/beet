import {ipcRenderer} from 'electron';
import store from '../store/index.js';
import {getKey} from './SecureRemote';
import getBlockchainAPI from "./blockchains/blockchainFactory";
import { useI18n } from 'vue-i18n';
const { t } = useI18n({ useScope: 'global' });

/*
 * @param {String} method
 * @param {String} id
 * @param {Object||Null} error
 * @param {promise} reject
 * @returns Error
 */
function _promptFail(method, id, error, reject) {
    if (!error.canceled) {
        console.log(error);
    }
    return reject({
        id: id,
        result: {
            isError: true,
            method: method,
            error: error.canceled ? "User rejected" : (error.error ? error.error : error)
        }
    });
}

/*
 * App requesting link to Beet wallet. Create window, wait for response.
 * @param {Object} request
 * @returns {Object}
 */
export async function linkRequest(request) {
    return new Promise(async (resolve, reject) => {

        /*
        let alertmsg = request.type === "link"
            ? t("common.link_alert", request)
            : t("common.access_alert", request.payload);
        */

        let linkReq = {appName: request.appName, origin: request.origin, chain: request.chain};

        store.dispatch(
          "WalletStore/notifyUser",
          {notify: "request", message: t("common.link_alert", linkReq)}
        );

        let accounts =  store.getters['AccountStore/getSafeAccountList'];
        if (!accounts) {
          return _promptFail("REQUEST_LINK", request.id, 'No accounts', reject);
        }

        let existingLinks = [];
        try {
          existingLinks = store.getters['OriginStore/getExistingLinks'](linkReq);
        } catch (error) {
          return _promptFail("REQUEST_LINK", request.id, error, reject);
        }

        ipcRenderer.send(
          'createPopup',
          {
            request: request,
            accounts: accounts,
            existingLinks: existingLinks
          }
        );

        ipcRenderer.once(`popupApproved_${request.id}`, (event, result) => {
            store.dispatch("AccountStore/selectAccount", result.response);
            return resolve(result);
        })

        ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
          return _promptFail("REQUEST_LINK", request.id, result, reject);
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
    let shownBeetApp = store.getters['OriginStore/getBeetApp'](request);
    if (!shownBeetApp) {
      return _promptFail("REQUEST_RELINK", request.id, 'No beetApp', reject);
    }

    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});

    let account = store.getters['AccountStore/getSafeAccount']({
                    account_id: shownBeetApp.accountID,
                    chain: shownBeetApp.chain
                  });

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
        return _promptFail("REQUEST_RELINK", request.id, result, reject);
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

    let shownBeetApp = store.getters['OriginStore/getBeetApp'](request);
    if (!shownBeetApp) {
      return _promptFail("getAccount", request.id, 'No beetApp', reject);
    }

    let account = store.getters['AccountStore/getSafeAccount']({
                    account_id: shownBeetApp.accountID,
                    chain: shownBeetApp.chain
                  });

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
      return _promptFail("getAccount", request.id, request, reject);
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

    ipcRenderer.send('createPopup', {request: request});

    ipcRenderer.once(`popupApproved_${request.id}`, async (event, result) => {

        let blockchain = getBlockchainAPI(request.chain);
        let txType = request.params[0];
        let finalResult;
        if (txType == "sign") {
            let transaction;
            try {
              transaction = await blockchain.sign(
                  request.params,
                  await getKey(store.getters['AccountStore/getActiveKey'](request))
              );
            } catch (error) {
              return _promptFail("sigReq", request.id, error, reject);
            }
            if (transaction) {
              finalResult = transaction.toObject();
            }
        } else if (txType == "broadcast") {
            try {
              finalResult = await blockchain.broadcast(request.params);
            } catch (error) {
              return _promptFail("sigReq", request.id, error, reject);
            }
        } else if (txType == "signAndBroadcast") {
            let transaction;
            try {
              transaction = await blockchain.sign(
                  request.params,
                  await getKey(store.getters['AccountStore/getActiveKey'](request))
              );
            } catch (error) {
              return _promptFail("sigReq", request.id, error, reject);
            }

            try {
              finalResult = await blockchain.broadcast(transaction);
            } catch (error) {
              return _promptFail("sigReq", request.id, error, reject);
            }
        }

        if (!finalResult) {
          return _promptFail("sigReq", request.id, 'No blockchain transfer result', reject);
        }

        return resolve(finalResult);
    });

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _promptFail("sigReq", request.id, request, reject);
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

    ipcRenderer.send('createPopup', {request: request});

    ipcRenderer.once(`popupApproved_${request.id}`, async (event, result) => {
        store.dispatch("WalletStore/notifyUser", {notify: "request", message: "Transaction successfully broadcast."});

        return result.response.success && result.request.id === request.id
          ? resolve(result)
          : _promptFail("injectedCall", request.id, 'Unsuccessful approval', reject);
    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _promptFail("injectedCall", request.id, request, reject);
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
      return _promptFail("voteFor", request.id, error, reject);
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

    ipcRenderer.once(`popupApproved_${request.id}`, async (event, result) => {
        let approvedAccount;
        try {
          approvedAccount = store.getters['AccountStore/getSafeAccount'](request);
        } catch (error) {
          return reject();
        }

        let blockchain = getBlockchainAPI(request.chain);

        let operation;
        try {
          operation = await blockchain.getOperation(request, approvedAccount);
        } catch (error) {
          return _promptFail("voteFor.getOperation", request.id, error, reject);
        }

        if (operation.nothingToDo) {
          return resolve({
              response: {
                  name: approvedAccount.accountName,
                  chain: approvedAccount.chain,
                  id: approvedAccount.accountID
              },
              request: {
                id: request.id
              }
          });
        }

        let signingKey;
        try {
          signingKey = await getKey(store.getters['AccountStore/getActiveKey'](request));
        } catch (error) {
          return _promptFail("voteFor.getKey", request.id, error, reject);
        }

        let transaction;
        try {
          transaction = await blockchain.sign(operation, signingKey);
        } catch (error) {
          return _promptFail("voteFor.sign", request.id, error, reject);
        }

        let broadcastResult;
        try {
          broadcastResult = await blockchain.broadcast(transaction);
        } catch (error) {
          return _promptFail("voteFor.broadcast", request.id, error, reject);
        }

        return !broadcastResult
          ? _promptFail("voteFor.broadcast", request.id, 'no broadcast', reject)
          : resolve(broadcastResult);
    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _promptFail("voteFor", request.id, result, reject);
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

    ipcRenderer.send('createPopup', {request: request});

    ipcRenderer.once(`popupApproved_${request.id}`, async (event, result) => {

        let retrievedKey = store.getters['AccountStore/getSigningKey'](request);

        let processedKey;
        try {
          processedKey = await getKey(retrievedKey)
        } catch (error) {
          return _promptFail("signMessage.getKey", request.id, error, reject);
        }

        let accountName;
        try {
          accountName = store.getters['AccountStore/getSafeAccount'](request).accountName;
        } catch (error) {
          return _promptFail("signMessage.getSafeAccount", request.id, error, reject);
        }

        let blockchain = getBlockchainAPI(request.chain);

        let signedMessage;
        try {
          signedMessage = await blockchain.signMessage(processedKey, accountName, request.params);
        } catch (error) {
          return _promptFail("blockchain.signMessage", request.id, error, reject);
        }

        return resolve(result);
    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _promptFail("signMessage.reject", request.id, result, reject);
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
    let accountDetails = store.getters['AccountStore/getSafeAccount'](request);

    if (!accountDetails) {
      return _promptFail("transfer.getSafeAccount", request.id, 'no account details', reject);
    }

    let popupContents = {
      request: request,
      chain: accountDetails.chain,
      accountName: accountDetails.accountName
    };

    let blockchain = getBlockchainAPI(request.chain);
    if (blockchain.supportsFeeCalculation() && request.chain === "BTC") {
        let activeKey;
        try {
          activeKey = await getKey(store.getters['AccountStore/getActiveKey'](request));
        } catch (error) {
          return _promptFail("transfer.getKey", request.id, error, reject);
        }

        if (activeKey) {
          let transferResult;
          try {
              transferResult = await blockchain.transfer(
                  activeKey, // Can we do this without the key?
                  accountDetails.accountName,
                  request.params.to,
                  {
                      amount: request.params.amount.satoshis || request.params.amount.amount,
                      asset_id: request.params.amount.asset_id
                  },
                  request.params.memo,
                  false // PREVENTS SENDING!
              );
          } catch (error) {
              return _promptFail("transfer.falseTransfer", request.id, error, reject);
          }

          if (transferResult) {
              popupContents['feeInSatoshis'] = transferResult.feeInSatoshis;
              popupContents['toSendFee'] = blockchain.format(transferResult.feeInSatoshis);
          }
        }
    }

    ipcRenderer.send('createPopup', popupContents)

    ipcRenderer.once(`popupApproved_${request.id}`, async (event, result) => {
      let approvedBlockchain = getBlockchainAPI(request.chain);

      if (!popupContents.request.params.amount) {
        popupContents.request.params.amount = popupContents.request.params.satoshis;
      }

      let signingKey;
      try {
        signingKey = await getKey(store.getters['AccountStore/getActiveKey'](request))
      } catch (error) {
        return _promptFail("transfer.getKey", request.id, error, reject);
      }

      let transferResult;
      try {
        transferResult = await approvedBlockchain.transfer(
            signingKey,
            store.getters['AccountStore/getSafeAccount'](request).accountName,
            request.params.to,
            {
                amount: request.params.amount.satoshis || request.params.amount.amount,
                asset_id: request.params.amount.asset_id
            },
            request.params.memo,
        );
      } catch (error) {
        return _promptFail("blockchain.transfer", request.id, error, reject);
      }

      if (!transferResult) {
        return _promptFail("blockchain.transfer", request.id, 'No blockchain transfer result', reject);
      }

      store.dispatch("WalletStore/notifyUser", {notify: "request", message: 'Transaction `transfer` successfully broadcast.'});

      return resolve(transferResult);
    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _promptFail("Transfer.reject", request.id, result, reject);
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

    ipcRenderer.send('createPopup', {request: request});

    ipcRenderer.once(`popupApproved_${request.id}`, async (event, result) => {
        let payload_dict = {};
        let payload_list = request.params.payload;
        if (payload_list[2] == "key") {
            for (let i = 0; i < payload_list.length - 1; i = i+2) {
                payload_dict[payload_list[i]] = payload_list[i + 1];
            }
        } else {
            for (let i = 3; i < payload_list.length - 1; i = i+2) {
                payload_dict[payload_list[i]] = payload_list[i + 1];
            }
            payload_dict.key = payload_list[2];
            payload_dict.from = payload_list[1];
        }

        let blockchain = getBlockchainAPI(
          payload_dict.chain
            ? payload_dict.chain
            : payload_dict.key.substr(0, 3)
        );

        blockchain
        .verifyMessage(request.params)
        .then(result => {
            return resolve(result);
        })
        .catch((error) => {
            return _promptFail("blockchain.verifyMessage", request.id, error, reject);
        });
    })

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _promptFail("verifyMessage.reject", request.id, result, reject);
    })
  });
}
