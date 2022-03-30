import {
    v4 as uuidv4
} from "uuid";
import OTPAuth from "otpauth";

import sha256 from "crypto-js/sha256.js";
import aes from "crypto-js/aes.js";
import ENC from 'crypto-js/enc-utf8.js';
import * as ed from '@noble/ed25519';

import { createServer } from "http";
import { Server } from "socket.io";

import {linkRequest} from './apiUtils.js';

import store from '../store/index.js';
import BeetAPI from './BeetAPI';
import BeetDB from './BeetDB.js';
import RendererLogger from "./RendererLogger";
const logger = new RendererLogger();

const rejectRequest = (req, error) => {
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
      console.log(error)
      rejectRequest(req, 'User rejected request')
    }

    if (!userResponse || !userResponse.response) {
      return rejectRequest(req, 'User rejected request');
    }

    console.log(req)

    let identityhash;
    try {
      identityhash = sha256(
        req.browser + ' ' + req.origin + ' ' + req.appName + ' ' + userResponse.response.chain + ' ' + userResponse.response.id
      ).toString();
    } catch (error) {
      console.log(error);
      return rejectRequest(req, error);
    }

    let app = store.state.OriginStore.apps.find(x => x.identityhash == identityhash);
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
      secret = await ed.getSharedSecret(privk, req.key);
    } catch (error) {
      console.error(error);
      return;
    }

    try {
      app = await store.dispatch('OriginStore/addApp', {
          appName: req.appName,
          identityhash: userResponse.identity.identityhash == identityhash
                          ? userResponse.identity.identityhash
                          : identityhash,
          origin: req.origin,
          account_id: userResponse.identity.id,
          chain: userResponse.identity.chain,
          secret: ed.utils.bytesToHex(secret),
          next_hash: req.payload.next_hash
      });
    } catch (error) {
      console.log(error);
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

    let app = store.state.OriginStore.apps.find(x => x.identityhash == req.payload.identityhash);
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
     * Handle user link/relink attempts
     *
     * @parameter {string} linkType
     * @parameter {socket} socket
     * @parameter {request} data
     */
    static async respondLink(linkType, socket, data) {

      if (!socket.isAuthenticated) {
        socket.emit("error", {id: data.id, error: true, payload: {code: 5, message: "Must authenticate first"}});
        return;
      }

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
        return;
      }

      if (!status) {
        console.log("No linkhandler status")
        return;
      }

      if (status.isLinked == true) {
          // link has successfully established
          this._establishLink(socket, status);
      }

      if (status) {
        let linkresponse = this._getLinkResponse(status);
        socket.emit("link", linkresponse);
      }
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
          socket.emit("connected", socket.id);

          socket.on("version", (callback) => {
            callback({
                api: process.env.npm_package_apiversion,
                ui: process.env.npm_package_version
            })
          });

          socket.on("ping", (callback) => {
            console.log("ping")
            callback(true)
          });

          socket.on("authenticate", async (data) => {
            logger.debug("incoming authenticate request", data);

            if (!store.state.WalletStore.isUnlocked) {
              console.log(`locked wallet: ${store.state.WalletStore.isUnlocked}`)
              socket.emit("error", {id: data.id, error: true, payload: {code: 7, message: "Beet wallet is not unlocked."}});
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
                "error",
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
              this._establishLink(socket.id, status);
              let linkResponse = this._getLinkResponse(status);
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

            socket.emit(
              "authenticated",
              {
                id: status.id,
                error: false,
                payload: {
                    authenticate: true,
                    link: false,
                    pub_key: ed.utils.bytesToHex(pubk),
                }
              }
            );

          });

          socket.on("linkRequest", async (data) => {
            if (!socket.isAuthenticated || !store.state.WalletStore.isUnlocked) {
              socket.emit("error", {id: data.id, error: true, payload: {code: 5, message: "Beet wallet is not unlocked."}});
              return;
            }
            logger.debug("processing link");
            try {
              await this.respondLink("link", socket, data);
            } catch (error) {
              console.log(error);
            }
          });

          socket.on("relinkRequest", async (data) => {
            if (!socket.isAuthenticated || !store.state.WalletStore.isUnlocked) {
              socket.emit("error", {id: data.id, error: true, payload: {code: 5, message: "Beet wallet is not unlocked."}});
              return;
            }
            logger.debug("processing relink");
            try {
              await this.respondLink("relink", socket, data);
            } catch (error) {
              console.log(error);
            }
          });

          socket.on("api", async (data) => {
            if (!socket.isAuthenticated || !store.state.WalletStore.isUnlocked) {
              socket.emit("error", {id: data.id, error: true, payload: {code: 5, message: "Beet wallet is not unlocked."}});
              return;
            }

            if (!socket.isLinked) {
              socket.emit("error", {id: data.id, error: true, payload: {code: 4, message: "This app is not yet linked"}})
              return;
            }

            let hash = await sha256('' + data.id).toString();

            if (!hash == socket.next_hash) {
              socket.emit("error", {id: data.id, error: true, payload: {code: 2, message: "Unexpected request hash. Please relink"}})
              return;
            }

            var key = socket.otp.generate();

            let decryptedValue;
            try {
              decryptedValue = aes.decrypt(data.payload, key).toString(ENC);
            } catch (error) {
              socket.emit("error", {id: data.id, error: true, payload: {code: 3, message: "Could not decrypt message"}});
              return;
            }

            let msg = JSON.parse(decryptedValue);
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

            logger.debug("incoming api request", apiobj);
            store.dispatch('OriginStore/newRequest', {
                identityhash: apiobj.payload.identityhash,
                next_hash: apiobj.payload.next_hash
            });

            let status;
            try {
              status = await BeetAPI.handler(apiobj);
            } catch (error) {
              console.log(error)
              logger.debug("incoming api req fail", error);
              return;
            }

            if (!status) {
              console.log('No BeetAPI handler user response');
              return;
            }

            status.id = data.id;
            socket.otp.counter = status.id;

            var key = socket.otp.generate();
            let payload;
            try {
              payload = aes.encrypt(JSON.stringify(status.result), key).toString();
            } catch (error) {
              console.log(error);
              socket.emit("error", {id: data.id, error: true, payload: {code: 3, message: "Could not encrypt api response"}});
              return;
            }

            socket.emit(
              'api',
              {id: status.id, error: !!status.result.isError, encrypted: true, payload: payload}
            );

          });

        });
        httpServer.listen(port);

        console.info("WebSocket server listening on port ", port);
    }

    /**
     * Create beet link
     * @parameter {socket} socket
     * @parameter {object} target
     */
    static _establishLink(socket, target) {
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

    static _getLinkResponse(result) {
        // todo: unify! isLinked comes from linkHandler, link from authHandler.
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

}
