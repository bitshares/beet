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

    console.log(request)

    let linkReq = {appName: request.appName, origin: request.origin, chain: request.chain};

    store.dispatch(
      "WalletStore/notifyUser",
      {notify: "request", message: window.t("common.link_alert", linkReq)}
    );
    /*
      {
          "appName": "NFTEA Gallery",
          "identityhash": "85ff4474e8e5a8183f774c11501cfcc592364b67bb244cb93a1cee63ce0b495a",
          "origin": "nftea.gallery",
          "account_id": "1.2.1808745",
          "chain": "BTS",
          "secret": "fd3a2f2207bb4aedb2885a8b326d67d6f4f0f478ee19b118c7845f609bed5f45",
          "next_hash": "87da8ac347d1244cbaee055833c3d3bbac4acc52b46d3ae88328700889f484aa",
          "id": 24
      }
    */

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
 * @returns {Object}
 */
export async function requestSignature(request) {
  // transaction request popup
  return new Promise(async (resolve, reject) => {
    store.dispatch("WalletStore/notifyUser", {notify: "request", message: `Signature request type: ${request.params[0]}`});

    if (!request || !request.payload) {
      return _promptFail("injectedCall", 'injectedCall', request, reject);
    }

    let blockchain;
    try {
      blockchain = getBlockchainAPI(request.payload.chain);
    } catch (error) {
      console.log(error);
      return _promptFail("injectedCall", request.id, request, reject);
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

    if (!request || !request.payload) {
      return _promptFail("injectedCall", 'injectedCall', request, reject);
    }

    let blockchain;
    try {
      blockchain = getBlockchainAPI(request.payload.chain);
    } catch (error) {
      console.log(error);
      return _promptFail("injectedCall", request.id, request, reject);
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
        let approvedAccount;
        try {
          approvedAccount = store.getters['AccountStore/getSafeAccount'](request);
        } catch (error) {
          return reject();
        }

        let operation;
        try {
          operation = await blockchain.getOperation(request, approvedAccount);
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

    let blockchain;
    try {
      blockchain = getBlockchainAPI(request.chain);
    } catch (error) {
      console.log(error);
      return _promptFail("injectedCall", request.id, request, reject);
    }

    let toSend = await blockchain.format(request.params.amount);

    let popupContents = {
      request: request,
      chain: accountDetails.chain,
      accountName: accountDetails.accountName,
      toSend: toSend
    };

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

    ipcRenderer.send('createPopup', popupContents);

    ipcRenderer.once(`popupApproved_${request.id}`, async (event, result) => {
      let approvedBlockchain = getBlockchainAPI(request.chain);

      if (!popupContents.request.params.amount) {
        popupContents.request.params.amount = popupContents.request.params.satoshis;
      }

      let activeKey = store.getters['AccountStore/getActiveKey'](request);

      let signingKey;
      try {
        signingKey = await getKey(activeKey);
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
