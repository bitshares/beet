import store from '../store/index.js';
import getBlockchainAPI from "./blockchains/blockchainFactory";
import { ipcRenderer } from 'electron';

export function showAlert(request) {
    let alertmsg = request.type === "link"
        ? t("common.link_alert", request)
        : t("common.access_alert", request.payload);

    store.dispatch("WalletStore/notifyUser", {notify: "request", message: alertmsg});
    // perform alert
    //alerts.value.push({ msg: alertmsg, id: uuidv4() });
}

export async function requestModal(request) {
  // trigger pop up
  return new Promise((resolve, reject) => {
    ipcRenderer.send(
      "popup",
      {
        _accept: resolve,
        _reject: reject,
        request: request
      }
    );
  });

}

export async function requestVote(payload) {
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

    return this.$refs.genericReqModal.show(payload, false);
}

export function isWhitelisted(identity, method) {
    if (
        !!store.state.WhitelistStore &&
        !!store.state.WhitelistStore.whitelist &&
        !!store.state.WhitelistStore.whitelist.filter
    ) {
        if (
            store.state.WhitelistStore.whitelist.filter(
                x => x.identityhash == identity && x.method == method
            ).length > 0
        ) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

export async function requestSignedMessage(payload) {
    if (isWhitelisted(payload.identityhash, "SignMessageRequestPopup")) {
        return {
            response: await this.$refs.signMessageModal.execute(payload),
            whitelisted: true
        };
    } else {
        return this.$refs.signMessageModal.show(payload, true);
    }
}

export function verifyMessage(payload) {
    return new Promise((resolve, reject) => {
        let payload_dict = {};
        let payload_list = payload.params.payload;
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
            ? messageChain = payload_dict.chain
            : messageChain = payload_dict.key.substr(0, 3)
        );

        blockchain
        .verifyMessage(payload.params)
        .then(result => {
            resolve(result);
        })
        .catch(err => {
            reject(err);
        });
    });
}
