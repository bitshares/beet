import {
    v4 as uuidv4
} from "uuid";
import * as OTPAuth from "otpauth";

import sha256 from "crypto-js/sha256.js";
import aes from "crypto-js/aes.js";
import ENC from 'crypto-js/enc-utf8.js';
import * as ed from '@noble/ed25519';

import { createServer } from "http";
import { Server } from "socket.io";

import {
  linkRequest,
  relinkRequest,
  getAccount,
  requestSignature,
  injectedCall,
  voteFor,
  signMessage,
  messageVerification,
  transfer
} from './apiUtils.js';
import getBlockchainAPI from "./blockchains/blockchainFactory.js";

import store from '../store/index.js';
import * as Actions from './Actions';
import BeetDB from './BeetDB.js';
import RendererLogger from "./RendererLogger";
const logger = new RendererLogger();

/**
 * Create beet link
 * @parameter {socket} socket
 * @parameter {object} target
 */
async function _establishLink(socket, target) {
    socket.isLinked = true;
    socket.identityhash = target.identityhash;
    socket.account_id = target.app.account_id;
    socket.chain = target.app.chain;
    socket.next_hash = target.app.next_hash;
    socket.otp = new OTPAuth.HOTP({
        issuer: "Beet",
        label: "BeetAuth",
        algorithm: "SHA1",
        digits: 32,
        counter: 0,
        secret: OTPAuth.Secret.fromHex(target.app.secret)
    });
}

/**
 * Create beet link
 * @parameter {object} result
 * @returns {object}
 */
function _getLinkResponse(result) {
    if (!result.isLinked == true) {
      return {
          id: result.id,
          error: true,
          payload: {
              code: 6,
              message: "Could not link to Beet"
          }
      };
    }

    let response = {
        id: result.id,
        error: false,
        payload: {
            authenticate: true,
            link: true,
            chain: result.app ? result.chain : result.identity.chain,
            existing: result.existing,
            identityhash: result.identityhash,
            requested: {
                account: {
                    name: result.app
                            ? result.app.account_name
                            : result.identity.name,
                    id: result.app
                            ? result.app.account_id
                            : result.identity.id
                }
            }
        }
    };

    // todo: analyze why the account name is not set and treat the cause not the sympton
    if (!response.payload.requested.account.name) {
        response.payload.requested.account.name = store.state.AccountStore.accountlist.find(
            x => x.accountID == response.payload.requested.account.id
        ).accountName;
    }

    return response;
}

const rejectRequest = (req, error) => {
  console.log(error)
  return {
      id: req.id,
      result: {
          isError: true,
          error: error
      }
  };
}

/*
 * Show the link/relink modal
 * @returns {bool}
 */
const linkHandler = async (req) => {
    // todo: only forward fields that are actually used in handler
    let userResponse;
    try {
      if (req.type == 'link') {
        userResponse = await linkRequest(Object.assign(req, {}));
      } else {
        userResponse = await relinkRequest(Object.assign(req, {}));
      }
    } catch (error) {
      return rejectRequest(req, 'User rejected request')
    }

    if (!userResponse || !userResponse.result) {
      return rejectRequest(req, 'User rejected request');
    }

    let identityhash;
    try {
      identityhash = sha256(
        req.browser + ' ' + req.origin + ' ' + req.appName + ' ' + userResponse.result.chain + ' ' + userResponse.result.id
      ).toString();
    } catch (error) {
      return rejectRequest(req, error);
    }

    let app = store.getters['OriginStore/getBeetApp']({payload: {identityhash: identityhash}});
    if (app) {
      console.log('relink');
      return Object.assign(req, {
          isLinked: true, // todo: can this also be called link?
          identityhash: identityhash,
          app: app,
          existing: true
      });
    }

    let secret;
    try {
      secret = await ed.getSharedSecret(req.key, req.payload.pubkey);
    } catch (error) {
      return rejectRequest(req, error);
    }

    try {
      app = await store.dispatch('OriginStore/addApp', {
          appName: req.appName,
          identityhash: identityhash,
          origin: req.origin,
          account_id: userResponse.result.id,
          chain: userResponse.result.chain,
          secret: ed.utils.bytesToHex(secret),
          next_hash: req.payload.next_hash
      });
    } catch (error) {
      return rejectRequest(req, error);
    }

    // todo: why copy content of request?
    return Object.assign(req, {
        isLinked: true, // todo: can this also be called link?
        identityhash: identityhash,
        app: app,
        existing: false
    });
};

/**
 * Apply appropriate auth fields to the user request payload
 *
 * @param {Object} req
 * @returns {Object}
 */
const authHandler = function (req) {
    if (!req.payload.identityhash) {
      // Comms authed but app not linked
      return Object.assign(req.payload, {authenticate: true, link: false});
    }

    let app = store.getters['OriginStore/getBeetApp'](req);
    if (!app || (!req.payload.origin == app.origin && !req.payload.appName == app.appName)) {
      // Reject authentication!
      return Object.assign(req.payload, {authenticate: false, link: false});
    }

    return Object.assign(req.payload, {
        authenticate: true,
        link: true,
        app: app
    });
};

export default class BeetServer {

    /**
     * Responding to multiple API query types
     * @parameter {socket} socket
     * @parameter {request} data
     */
    static async respondAPI(socket, data) {
      let hash = await sha256('' + data.id).toString();

      if (!hash == socket.next_hash) {
        socket.emit("api", {id: data.id, error: true, payload: {code: 2, message: "Unexpected request hash. Please relink then resubmit api request."}})
        return;
      }

      var key = socket.otp.generate();

      let decryptedValue;
      try {
        decryptedValue = aes.decrypt(data.payload, key).toString(ENC);
      } catch (error) {
        console.log(error);
        socket.emit("api", {id: data.id, error: true, payload: {code: 3, message: "Could not decrypt message"}});
        return;
      }

      let msg = JSON.parse(decryptedValue);
      if (!Object.keys(Actions).map(key => Actions[key]).includes(msg.method)) {
          console.log("Unsupported request type rejected");
          socket.emit("api", {id: data.id, error: true, payload: {code: 3, message: "Request type not supported."}});
          return;
      }

      socket.next_hash = msg.next_hash;
      msg.origin = socket.origin;
      msg.appName = socket.appName;
      msg.identityhash = socket.identityhash;
      msg.chain = socket.chain;
      msg.account_id = socket.account_id;

      let apiobj = {
        client: socket.id,
        id: data.id,
        type: msg.method,
        payload: msg
      };

      store.dispatch('OriginStore/newRequest', {
          identityhash: apiobj.payload.identityhash,
          next_hash: apiobj.payload.next_hash
      });

      let blockchainActions = [
        Actions.SIGN_MESSAGE,
        Actions.VERIFY_MESSAGE,
        Actions.TRANSFER,
        Actions.VOTE_FOR,
        Actions.INJECTED_CALL,
        Actions.REQUEST_SIGNATURE
      ];

      let blockchain;
      if (blockchainActions.includes(apiobj.type)) {
        try {
          blockchain = await getBlockchainAPI(apiobj.payload.chain);
        } catch (error) {
          console.log(error);
          socket.emit("api", {id: data.id, error: true, payload: {code: 3, message: "Blockchain API failure"}});
          return;
        }
      }

      let status;
      try {
        if (apiobj.type === Actions.GET_ACCOUNT) {
          status = await getAccount(apiobj);
        } else if (apiobj.type === Actions.REQUEST_SIGNATURE) {
          status = await requestSignature(apiobj, blockchain);
        } else if (apiobj.type === Actions.INJECTED_CALL) {
          status = await injectedCall(apiobj, blockchain);
        } else if (apiobj.type === Actions.VOTE_FOR) {
          status = await voteFor(apiobj, blockchain);
        } else if (apiobj.type === Actions.SIGN_MESSAGE) {
          status = await signMessage(apiobj, blockchain);
        } else if (apiobj.type === Actions.VERIFY_MESSAGE) {
          status = await messageVerification(apiobj, blockchain);
        } else if (apiobj.type === Actions.TRANSFER) {
          status = await transfer(apiobj, blockchain);
        }
      } catch (error) {
        console.log(error || "No status")
        logger.debug("incoming api req fail", error);
        socket.emit("api", {id: data.id, error: true, payload: {code: 4, message: "Negative user response"}})
        return;
      }

      if (!status.result || status.result.isError || status.result.canceled) {
        console.log("Issue occurred in approved prompt");
        socket.emit("api", {id: data.id, error: true, payload: {code: 7, message: "API request unsuccessful"}});
        return;
      }

      status.id = data.id;
      socket.otp.counter = status.id;

      let payload;
      try {
        payload = aes.encrypt(JSON.stringify(status.result), key).toString();
      } catch (error) {
        console.log(error);
        socket.emit("api", {id: data.id, error: true, payload: {code: 3, message: "Could not encrypt api response"}});
        return;
      }

      socket.emit(
        'api',
        {
          id: status.id,
          error: !!status.result.isError,
          encrypted: true,
          payload: payload
        }
      );
      return;
    }

    /**
     * Handle user link/relink attempts
     *
     * @parameter {string} linkType
     * @parameter {socket} socket
     * @parameter {request} data
     */
    static async respondLink(linkType, socket, data) {

      if (linkType == "relink") {
        socket.isLinked = false;
      }

      let status;
      try {
        status = await linkHandler({
            id: data.id,
            client: socket.id,
            payload: data.payload,
            chain: data.payload.chain,
            origin: socket.origin,
            appName: socket.appName,
            browser: socket.browser,
            key: socket.keypair,
            type: linkType
        });
      } catch (error) {
        console.log(error)
        logger.debug("incoming relink req fail", error);
        socket.emit("api", {id: data.id, error: true, payload: {code: 7, message: "API request unsuccessful"}});
        return;
      }

      if (!status || status.result && status.result.isError) {
        console.log("No linkhandler status");
        socket.emit("api", {id: data.id, error: true, payload: {code: 7, message: "API request unsuccessful"}});
        return;
      }

      if (status.isLinked == true) {
          // link has successfully established
          _establishLink(socket, status);
      }

      socket.emit("link", _getLinkResponse(status));
      return;
    }

    /**
     * @parameter {Vue} vue
     * @parameter {number} port
     * @returns {BeetServer}
     */
    static async initialize(vue, port) {
        const httpServer = createServer();
        const io = new Server(
          httpServer,
          {cors: {origin: "*", methods: ["GET", "POST"]}}
        );

        io.on("connection", async (socket) => {
          socket.isAuthenticated = false;

          socket.emit("connected", socket.id);

          socket.on("ping", (callback) => {
            console.log("ping")
            callback(true)
          });

          /*
           * Wallet handshake with client.
           */
          socket.on("authenticate", async (data, ackCallback) => {
            logger.debug("incoming authenticate request", data);

            if (!store.state.WalletStore.isUnlocked) {
              console.log(`locked wallet: ${store.state.WalletStore.isUnlocked}`)
              socket.emit("api", {id: data.id, error: true, payload: {code: 7, message: "Beet wallet authentication error."}});
              return;
            }

            let status;
            try {
              status = await authHandler({
                id: data.id,
                client: socket.id,
                payload: data.payload
              });
            } catch (error) {
              console.log(error)
              logger.debug("incoming auth req fail", error);
            }

            status.id = data.id; // necessary or not?

            if (!status.authenticate) {
              socket.emit(
                "api",
                {
                    id: status.id,
                    error: true,
                    payload: {
                        code: 7,
                        message: "Could not authenticate"
                    }
                }
              );
              socket.isAuthenticated = false;
              return;
            }

            socket.isAuthenticated = true;
            socket.origin = status.origin;
            socket.appName = status.appName;
            socket.browser = status.browser;

            if (status.link == true) {
              _establishLink(socket.id, status);
              let linkResponse = _getLinkResponse(status);
              console.log("Existing link");
              socket.emit('authenticated', linkResponse);
              return;
            }

            const privk = ed.utils.randomPrivateKey();
            socket.keypair = privk;

            let pubk;
            try {
              pubk = await ed.getPublicKey(privk);
            } catch (error) {
              console.error(error);
              return;
            }

            ackCallback({
                id: status.id,
                error: false,
                payload: {
                    authenticate: true,
                    link: false,
                    pub_key: ed.utils.bytesToHex(pubk),
                }
            })

          });

          /*
           * An authenticated client requests to link with Beet wallet.
           */
          socket.on("linkRequest", async (data) => {
            if (!socket.isAuthenticated || !store.state.WalletStore.isUnlocked) {
              logger.debug("Rejected link: locked wallet");
              socket.emit("api", {id: data.id, error: true, payload: {code: 5, message: "Beet wallet authentication error."}});
              return;
            }
            logger.debug("processing link");
            try {
              await this.respondLink("link", socket, data);
            } catch (error) {
              console.log(error);
              if (socket) {
                socket.emit("api", {id: data.id, error: true, payload: {code: 7, message: "Link request unsuccessful."}});
              }
            }
          });

          /*
           * An authenticated client requests to relink with Beet wallet.
           */
          socket.on("relinkRequest", async (data) => {
            if (!socket.isAuthenticated || !store.state.WalletStore.isUnlocked) {
              socket.emit("api", {id: data.id, error: true, payload: {code: 5, message: "Beet wallet authentication error."}});
              return;
            }
            logger.debug("processing relink");
            try {
              await this.respondLink("relink", socket, data);
            } catch (error) {
              console.log(error);
              if (socket) {
                socket.emit("api", {id: data.id, error: true, payload: {code: 7, message: "Relink request unsuccessful."}});
              }
            }
          });

          /*
           * An authenticated & linked client requests an api call.
           */
          socket.on("api", async (data) => {
            if (!socket.isAuthenticated || !store.state.WalletStore.isUnlocked) {
              socket.emit("api", {id: data.id, error: true, payload: {code: 5, message: "Beet wallet authentication error."}});
              return;
            }

            if (!socket.isLinked) {
              socket.emit("api", {id: data.id, error: true, payload: {code: 4, message: "This app is not yet linked. Link then try again."}})
              return;
            }

            logger.debug("processing api request");

            try {
              await this.respondAPI(socket, data);
            } catch (error) {
              console.log(error);
              if (socket) {
                socket.emit("api", {id: data.id, error: true, payload: {code: 7, message: "API request unsuccessful."}});
              }
            }
          });

        });
        httpServer.listen(port);

        console.info("WebSocket server listening on port ", port);
    }

}
