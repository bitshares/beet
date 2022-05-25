import {ipcRenderer} from 'electron';
import store from '../store/index.js';
import {getKey} from './SecureRemote.js';
import getBlockchainAPI from "./blockchains/blockchainFactory.js";

/*
 * @param {String} method
 * @param {String} id
 * @param {Object||Null} error
 * @param {promise} reject
 * @returns Error
 */
function _promptFail(method, id, error, reject) {
    console.log(error);
    return reject({
        id: id,
        result: {
            isError: true,
            method: method,
            error: error
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
            ? window.t("common.link_alert", request)
            : window.t("common.access_alert", request.payload);
        */

        let linkReq = {appName: request.appName, origin: request.origin, chain: request.chain};

        store.dispatch(
          "WalletStore/notifyUser",
          {notify: "request", message: window.t("common.link_alert", linkReq)}
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
            store.dispatch("AccountStore/selectAccount", result.result);
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

    let linkReq = {appName: request.appName, origin: request.origin, chain: request.chain};

    store.dispatch(
      "WalletStore/notifyUser",
      {notify: "request", message: window.t("common.link_alert", linkReq)}
    );

    let account = store.getters['AccountStore/getSafeAccount'](JSON.parse(JSON.stringify(shownBeetApp)));

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

    let account = store.getters['AccountStore/getSafeAccount'](JSON.parse(JSON.stringify(shownBeetApp)));

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
 * sign or broadcast (REQUEST_SIGNATURE || INJECTED_CALL)
 *
 * @param {API} blockchain
 * @param {Object} request
 * @param {Promise} resolve
 * @param {Promise} reject
 * @returns {Object}
 */
async function _signOrBroadcast(
  blockchain,
  request,
  resolve,
  reject
) {
  let finalResult;
  let notifyTXT = "";

  let txType = request.payload.params[0];

  if (txType == "broadcast") {
      try {
        finalResult = await blockchain.broadcast(request.payload.params);
      } catch (error) {
        console.log(error)
        return _promptFail(txType, request.id, error, reject);
      }
      notifyTXT = "Transaction successfully broadcast.";
      return resolve(finalResult);
  }

  let activeKey = store.getters['AccountStore/getActiveKey'](request);

  let signingKey;
  try {
    signingKey = await getKey(activeKey);
  } catch (error) {
    console.log(error)
    return _promptFail(txType + '.getKey', request.id, error, reject);
  }

  let transaction;
  try {
    transaction = await blockchain.sign(request.payload.params, signingKey);
  } catch (error) {
    console.log(error)
    return _promptFail(txType + '.blockchain.sign', request.id, error, reject);
  }

  if (txType == "sign") {
      finalResult = transaction.toObject();
      notifyTXT = "Transaction successfully signed.";
  } else if (txType == "signAndBroadcast") {
      try {
        finalResult = await blockchain.broadcast(transaction);
      } catch (error) {
        return _promptFail(txType + ".broadcast", request.id, error, reject);
      }
      notifyTXT = "Transaction successfully signed & broadcast.";;
  }

  store.dispatch("WalletStore/notifyUser", {notify: "request", message: notifyTXT});

  return resolve(finalResult);
}

/*
 * Prompt the user to provide their signature.
 * @param {Object} request
 * @param {Object} blockchain
 * @returns {Object}
 */
export async function requestSignature(request, blockchain) {
  // transaction request popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: `Signature request type: ${request.params[0]}`});

    if (!request || !request.payload) {
      return _promptFail("requestSignature", 'requestSignature', request, reject);
    }

    let visualizedParams;
    try {
        visualizedParams = await blockchain.visualize(request.payload.params);
    } catch (error) {
        console.log(error);
        return _promptFail("requestSignature", request.id, request, reject);
    }

    let visualizedAccount;
    try {
        visualizedAccount = await blockchain.visualize(request.payload.account_id);
    } catch (error) {
        console.log(error);
        return _promptFail("requestSignature", request.id, request, reject);
    }

    ipcRenderer.send(
      'createPopup',
      {
        request: request,
        visualizedAccount: visualizedAccount,
        visualizedParams: visualizedParams
      }
    );

    ipcRenderer.once(`popupApproved_${request.id}`, async (event, result) => {
      return _signOrBroadcast(blockchain, request, resolve, reject);
    });

    ipcRenderer.once(`popupRejected_${request.id}`, (event, result) => {
      return _promptFail("requestSignature", request.id, request, reject);
    })
  });
}

/*
 * Perform a query using an injected blockchain library
 * @param {Object} request
 * @returns {Object}
 */

export async function injectedCall(request, blockchain) {
  // transaction request popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "request"});

    if (!request || !request.payload) {
      return _promptFail("injectedCall", 'injectedCall', request, reject);
    }

    let visualizedParams;
    try {
        visualizedParams = await blockchain.visualize(request.payload.params);
    } catch (error) {
        console.log(error);
        return _promptFail("injectedCall", request.id, request, reject);
    }

    let visualizedAccount;
    try {
        visualizedAccount = await blockchain.visualize(request.payload.account_id);
    } catch (error) {
        console.log(error);
        return _promptFail("injectedCall", request.id, request, reject);
    }

    ipcRenderer.send(
      'createPopup',
      {
        request: request,
        visualizedAccount: visualizedAccount,
        visualizedParams: visualizedParams
      }
    );

    ipcRenderer.once(`popupApproved_${request.id}`, async (event, result) => {
      return _signOrBroadcast(blockchain, request, resolve, reject);
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
export async function voteFor(request, blockchain) {
  // generic request popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "Vote prompt"});

    let payload = request.payload;

    payload.action = "vote";
    let mappedData;
    try {
      mappedData = await blockchain.mapOperationData(payload);
    } catch (error) {
      return _promptFail("voteFor", request.id, error, reject);
    }

    payload.generic = {
        title: window.t("operations.vote.title"),
        message: window.t("operations.vote.request", {
            appName: payload.appName,
            origin: payload.origin,
            entity: mappedData.entity,
            chain: payload.chain,
            accountName: payload.account_id
        }),
        details: mappedData.description,
        acceptText: window.t("operations.vote.accept_btn"),
        rejectText: window.t("operations.vote.reject_btn")
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

        let shownBeetApp = store.getters['OriginStore/getBeetApp'](request);
        if (!shownBeetApp) {
          return _promptFail("getAccount", request.id, 'No beetApp', reject);
        }

        let approvedAccount = store.getters['AccountStore/getSafeAccount'](JSON.parse(JSON.stringify(shownBeetApp)));

        let operation;
        try {
          operation = await blockchain.getOperation(payload, approvedAccount);
        } catch (error) {
          return _promptFail("voteFor.getOperation", request.id, error, reject);
        }

        if (operation.nothingToDo) {
          return resolve({
              result: {
                  name: approvedAccount.accountName,
                  chain: approvedAccount.chain,
                  id: approvedAccount.accountID
              },
              request: {
                id: request.id
              }
          });
        }

        let activeKey = store.getters['AccountStore/getActiveKey'](request);

        let signingKey;
        try {
          signingKey = await getKey(activeKey);
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
export async function signMessage(request, blockchain) {
  //signed message popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "Request for signed message"});

    let shownBeetApp = store.getters['OriginStore/getBeetApp'](request);
    if (!shownBeetApp) {
      return _promptFail("REQUEST_RELINK", request.id, 'No beetApp', reject);
    }
    let account = store.getters['AccountStore/getSafeAccount'](JSON.parse(JSON.stringify(shownBeetApp)));

    ipcRenderer.send(
      'createPopup',
      {
        request: request,
        accounts: [account]
      }
    );

    ipcRenderer.once(`popupApproved_${request.id}`, async (event, result) => {

        let retrievedKey;
        try {
          retrievedKey = store.getters['AccountStore/getSigningKey'](request);
        } catch (error) {
          return _promptFail("signMessage.getSigningKey", request.id, error, reject);
        }

        let processedKey;
        try {
          processedKey = await getKey(retrievedKey)
        } catch (error) {
          return _promptFail("signMessage.getKey", request.id, error, reject);
        }

        let accountName;
        try {
          accountName = account.accountName;
        } catch (error) {
          return _promptFail("signMessage.accountName", request.id, error, reject);
        }

        let signedMessage;
        try {
          signedMessage = await blockchain.signMessage(processedKey, accountName, request.params);
        } catch (error) {
          return _promptFail("blockchain.signMessage", request.id, error, reject);
        }

        return resolve({result: signedMessage});
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
export async function transfer(request, blockchain) {
  // transfer req popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "Token transfer request"});

    let shownBeetApp = store.getters['OriginStore/getBeetApp'](request);
    if (!shownBeetApp) {
      return _promptFail("transfer", request.id, 'No beetApp', reject);
    }

    let accountDetails;
    try {
      accountDetails = store.getters['AccountStore/getSafeAccount'](JSON.parse(JSON.stringify(shownBeetApp)));
    } catch (error) {
      console.log(accountDetails);
      return _promptFail("transfer", request.id, 'getSafeAccount', reject);
    }

    let toSend;
    try {
      toSend = await blockchain.format(request.payload.params.amount, accountDetails.chain);
    } catch (error) {
      console.log(error);
      return _promptFail("transfer", request.id, 'No toSend', reject);
    }

    //console.log(popupContents)

    /*
    {
        "request": {
            "client": "SOyHVIuiT9p9XyohAAAD",
            "id": "d7b66d78-e1f4-419e-b2e1-9e0807a9d970",
            "type": "transfer",
            "payload": {
                "method": "transfer",
                "params": {
                    "to": "1.2.5",
                    "amount": {
                        "satoshis": "1",
                        "asset_id": "1.3.0"
                    }
                },
                "next_hash": "8024c279e0bf3bb725571c90bc63ee5e2e0e3c2701e10ecc79af36b476d9ba85",
                "origin": "nftea.gallery",
                "appName": "NFTEA Gallery",
                "identityhash": "85ff4474e8e5a8183f774c11501cfcc592364b67bb244cb93a1cee63ce0b495a",
                "chain": "BTS",
                "account_id": "1.2.1808745"
            }
        },
        "chain": "BTS",
        "accountName": "beettester1",
        "toSend": "1sat of undefined"
    }
    */


    /*
    if (!request.payload.params.amount && request.payload.params.satoshis) {
      popupContents.request.payload.params.amount = request.payload.params.satoshis;
    }

    if (blockchain.supportsFeeCalculation() && request.chain === "BTC") {

        let activeKey = store.getters['AccountStore/getActiveKey'](request);

        let signingKey;
        try {
          signingKey = await getKey(activeKey);
        } catch (error) {
          return _promptFail("transfer.getKey", request.id, error, reject);
        }

        if (signingKey) {
          let transferResult;
          try {
              transferResult = await blockchain.transfer(
                  signingKey, // Can we do this without the key?
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
    */


    ipcRenderer.send(
      'createPopup',
      {
        request: request,
        chain: accountDetails.chain,
        accountName: accountDetails.accountName,
        toSend: toSend
      }
    );

    ipcRenderer.once(`popupApproved_${request.id}`, async (event, result) => {
      let activeKey = store.getters['AccountStore/getActiveKey'](request);

      let signingKey;
      try {
        signingKey = await getKey(activeKey);
      } catch (error) {
        return _promptFail("transfer.getKey", request.id, error, reject);
      }

      let transferResult;
      try {
        transferResult = await blockchain.transfer(
            signingKey,
            accountDetails.accountName,
            request.payload.params.to,
            {
                amount: request.payload.params.amount.amount ||
                        request.payload.params.amount.satoshis,
                asset_id: request.payload.params.amount.asset_id
            },
            request.payload.params.memo ?? null,
        );
      } catch (error) {
        return _promptFail("blockchain.transfer", request.id, error, reject);
      }

      if (!transferResult) {
        return _promptFail("blockchain.transfer", request.id, 'No blockchain transfer result', reject);
      }

      store.dispatch("WalletStore/notifyUser", {notify: "request", message: 'Transaction `transfer` successfully broadcast.'});
      return resolve({result: transferResult});
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
export async function messageVerification(request, blockchain) {
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: "Message verification"});

    let payloadParams = JSON.parse(request.payload.params);

    ipcRenderer.send(
      'createPopup',
      {
        request: request,
        payload: {
          generic: {
            acceptText: 'Verify',
            rejectText: 'Reject verification',
            message: 'Verify the following signature was created by this account?',
            details: payloadParams.signature
          }
        }
      }
    );

    ipcRenderer.once(`popupApproved_${request.id}`, async (event, result) => {
        blockchain
        .verifyMessage(request)
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
