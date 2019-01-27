import EventEmitter from "events";
import {
  version
} from "../config/config";
import WebSocket from "ws";
import {
  v4 as uuidv4
} from "uuid"
const OTPAuth = require("otpauth");
import CryptoJS from 'crypto-js';
import crypto from 'crypto';
//import eccrypto from 'eccrypto';
import Https from 'https';
import Fs from 'fs';
import { ec as EC } from "elliptic"; 
var ec = new EC('curve25519');
/*
import RendererLogger from "./RendererLogger";
const logger = new RendererLogger();
*/
export default class BeetWS extends EventEmitter {
  constructor(port, timeout) {
    super() // required
    var self = this;
    const httpsServer = Https.createServer({
      key: Fs.readFileSync(__dirname + '/ssl/beet.key'),
      cert: Fs.readFileSync(__dirname + '/ssl/beet.cert')
    });
    const server = new WebSocket.Server({
      server: httpsServer
    });
    httpsServer.listen(port);
    this._clients = [];
    this._monitor = setInterval(function () {
      for (var clientid in self._clients) {

        let client = self._clients[clientid];
        if (client.isAlive === false || client.readyState != 1) {
          self.emit("disconnected", client.id);
          delete(self._clients[client.id]);
          return client.terminate();
        } else {
          client.isAlive = false;
          client.ping(self.noop);
        }
      }
    }, timeout);
    server.on("connection", (client) => {
      self._handleConnection(client);
    });
  }
  noop() {

  }
  _heartbeat() {
    this.isAlive = true;
  }
  _handleMessage(client, data) {
    console.log("_handleMessage", client, data);
    if (data.type == 'version') {
      client.send('{ "type": "version", "error": false, "result": { "version": ' + JSON.stringify(version) + '}}');
    } else {
      if (client.isAuthenticated) {
        if (client.isLinked) {
          if (data.type == 'api') {
            let hash = CryptoJS.SHA256('' + data.id).toString();
            if (hash == client.next_hash) {
              client.otp.counter = data.id;
              var key = client.otp.generate();
              try {
                var msg = JSON.parse(CryptoJS.AES.decrypt(data.payload, key).toString(CryptoJS.enc.Utf8));

                msg.origin = client.origin;
                msg.appName = client.appName;
                msg.apphash = client.apphash;
                msg.chain = client.chain;
                msg.account_id = client.account_id;
                client.next_hash = msg.next_hash;
                this.emit('api', {
                  "client": client.id,
                  "id": data.id,
                  "type": msg.method,
                  "payload": msg
                });
              } catch (e) {
                client.send('{ "id": "' + data.id + '", "error": true, "payload": { "code": 3, "message": "Could not decrypt message"}}');
              }
            } else {
              client.send('{ "id": "' + data.id + '", "error": true, "payload": { "code":2,"message": "Unexpected request hash. Please relink"}}');
            }
          } else {
            client.send('{ "id": "' + data.id + '", "error": true, "payload": { "code":1, "message": "Beet could not understand your request"}}');
          }
        } else {
          if (data.type == 'link') {
            let linkobj = {
              "id": data.id,
              "client": client.id,
              "payload": data.payload,
              "chain": data.payload.chain,
              "origin": client.origin,
              "appName": client.appName,
              "browser": client.browser,
              "key": client.keypair,
              "type": 'link'
            };
            this.emit('link', linkobj);
          } else {
            client.send('{ "id": "' + data.id + '", "error": true, "payload": { "code":4, "message": "This app is not yet linked"}}');
          }
        }
      } else {
        if (data.type == 'authenticate') {
          this.emit('authenticate', {
            "id": data.id,
            "client": client.id,
            "payload": data.payload
          });
        } else {
          client.send('{ "id": "' + data.id + '", "error": true, "payload": { "code":5, "message": "Must authenticate first"}}');
        }
      }
    }
  }
  async respondLink(client, result) {
    if (result.isLinked == true) {
      this._clients[client].isLinked = true;
      this._clients[client].apphash = result.apphash;
      this._clients[client].account_id = result.account_id;
      this._clients[client].chain = result.chain;
      this._clients[client].next_hash = result.next_hash;
      let otp = new OTPAuth.HOTP({
        issuer: "Beet",
        label: "BeetAuth",
        algorithm: "SHA1",
        digits: 32,
        counter: 0,
        secret: OTPAuth.Secret.fromHex(result.secret)
      });
      this._clients[client].otp = otp;
      this._clients[client].send('{"id": ' + result.id + ', "error": false, "payload": { "authenticate": true, "link": true, "account_id": "' + result.account_id + '"}}');
    } else {
      this._clients[client].send('{ "id": "' + result.id + '", "error": true, "payload": { "code":6, "message": "Could not link to Beet"}}');
    }
  }
  respondAPI(client, response) {
    this._clients[client].otp.counter = response.id;
    var key = this._clients[client].otp.generate();

    var payload = CryptoJS.AES.encrypt(JSON.stringify(response.result), key).toString();
    this._clients[client].send('{"id": ' + response.id + ', "error": false , "encrypted": true, "payload": "' + payload + '"}');
  }
  respondAuth(client, result) {
    if (result.authenticate) {
      this._clients[client].isAuthenticated = true;
      this._clients[client].origin = result.origin;
      this._clients[client].appName = result.appName;
      this._clients[client].browser = result.browser;
      if (result.link) {
        this._clients[client].isLinked = true;
        this._clients[client].apphash = result.apphash;
        this._clients[client].chain = result.app.chain;
        this._clients[client].account_id = result.app.account_id;
        this._clients[client].next_hash = result.app.next_hash;
        let otp = new OTPAuth.HOTP({
          issuer: "Beet",
          label: "BeetAuth",
          algorithm: "SHA1",
          digits: 32,
          counter: 0,
          secret: OTPAuth.Secret.fromHex(result.app.secret)
        });
        this._clients[client].otp = otp;
        this._clients[client].send('{"id": ' + result.id + ', "error": false, "payload": { "authenticate": true, "link": true, "account_id": "' + result.app.account_id + '"}}');
      } else {
        let keypair= ec.genKeyPair();
        this._clients[client].keypair = keypair;
        let pubkey = keypair.getPublic().encode('hex');
        this._clients[client].send('{"id": ' + result.id + ', "error": false, "payload": { "authenticate": true, "link": false, "pub_key": "' + pubkey + '"}}');
      }
    } else {
      this._clients[client].send('{"id": ' + result.id + ', "error": true, "payload": { "code":7, "message": "Could not authenticate"}}');
    }
  }
  _handleConnection(client) {
    client.id = uuidv4();
    client.isAlive = true;
    client.isAuthenticated = false;
    let self = this;
    client.on("pong", this._heartbeat);
    this._clients[client.id] = client;
    this.emit("connected", client.id);
    client.on("message", function (msg) {
      let message = JSON.parse(msg);
      self._handleMessage(client, message);
    });
  }
}