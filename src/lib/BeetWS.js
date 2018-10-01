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
import eccrypto from 'eccrypto';

export default class BeetWS extends EventEmitter {
  constructor(port, timeout) {
    super() // required
    var self = this;
    const server = new WebSocket.Server({
      port: port
    });
    this._clients = [];
    this._monitor = setInterval(function () {
      for (var clientid in self._clients) {

        let client = self._clients[clientid];
        console.log(client);
        if (client.isAlive === false || client.readyState != 1) {
          self.emit("disconnected", client.id);
          delete(self._clients[client.id]);
          console.log("Terminating client")
          return client.terminate();
        } else {
          client.isAlive = false;
          client.ping(self.noop);
        }
      }
    }, timeout);
    console.log(self);
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

    if (data.type == 'version') {
      client.send('{ "id": "' + data.id + '", "error": false, "payload": { "version": "' + JSON.stringify(version) + '"}}');
    }
    if (client.isAuthenticated) {
      if (client.isLinked) {
        if (data.type == 'api') {
          let hash = CryptoJS.SHA256(data.id);
          if (hash == client.next_hash) {
            client.otp.counter = data.id;
            var key = client.otp.generate();
            try {
              var msg = CryptoJS.AES.decrypt(data.payload, key).toString(CryptoJS.enc.Utf8);
              client.next_hash = msg.next_hash;
              this.emit('api', {
                "client": client.id,
                "id": data.id,
                "payload": msg
              });
            } catch (e) {
              client.send('{ "id": "' + data.id + '", "error": true, "payload": { "message": "Could not decrypt message"}}');
            }
          } else {
            client.send('{ "id": "' + data.id + '", "error": true, "payload": { "message": "Unexpected request id. Please relink"}}');
          }
        } else {
          client.send('{ "id": "' + data.id + '", "error": true, "payload": { "message": "Beet could not understand your request"}}');
        }
      } else {
        if (data.type == 'link') {
          this.emit('link', {
            "id": data.id,
            "client": client.id,
            "payload": data.payload
          });
        } else {
          client.send('{ "id": "' + data.id + '", "error": true, "payload": { "message": "This app is not yet linked"}}');
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
        client.send('{ "id": "' + data.id + '", "error": true, "payload": { "message": "Must authenticate first"}}');
      }
    }
  }
  async respondLink(client, result) {
    if (result.isLinked == true) {
      this._clients[client].isLinked = true;
      this._clients[client].apphash = result.apphash;
      this._clients[client].chain = result.chain;
      this._clients[client].next_hash = result.next_hash;
      let secret = await eccrypto.derive(this._clients[client].pk, result.pubkey);
      let otp = new OTPAuth.HOTP({
        issuer: "Beet",
        label: "BeetAuth",
        algorithm: "SHA1",
        digits: 32,
        counter: 0,
        secret: OTPAuth.Secret.fromHex(secret)
      });
      this._clients[client].otp = otp;
      this._clients[client].send('{"id": ' + result.id + ', "error": false, "payload": { "authenticate": true, "link": true, "account_id": "' + result.account_id + '"}}');
    } else {
      this._clients[client].send('{ "id": "' + result.id + '", "error": true, "payload": { "message": "Could not link to Beet"}}');
    }
  }
  respondAPI(client, result) {

    this._clients[client].otp.counter = result.id;
    var key = this._clients[client].otp.generate();
    var payload = CryptoJS.AES.encrypt(JSON.stringify(result.response), key).toString();
    this._clients[client].send('{"id": ' + result.id + ', "error": false , "encrypted": true, "payload": "' + payload + '"}');
  }
  respondAuth(client, result) {
    if (result.authenticate) {
      this._clients[client].isAuthenticated = true;
      this._clients[client].origin = result.origin;
      this._clients[client].app_name = result.app_name;
      this._clients[client].browser = result.browser;
      if (result.link) {
        this._clients[client].isLinked = true;
        this._clients[client].apphash = result.apphash;
        this._clients[client].chain = result.chain;
        this._clients[client].next_hash = result.next_hash;
        let otp = new OTPAuth.HOTP({
          issuer: "Beet",
          label: "BeetAuth",
          algorithm: "SHA1",
          digits: 32,
          counter: 0,
          secret: OTPAuth.Secret.fromHex(this._clients[client].secret)
        });
        this._clients[client].otp = otp;
        this._clients[client].send('{"id": ' + result.id + ', "error": false, "payload": { "authenticate": true, "link": true, "account_id": "' + result.account_id + '"}}');
      } else { 
        this._clients[client].pk = crypto.randomBytes(32);
        let pubkey = eccrypto.getPublic(this._clients[client].pk).toString('hex');
        this._clients[client].send('{"id": ' + result.id + ', "error": false, "payload": { "authenticate": true, "link": false, "pub_key": "' + pubkey + '"}}');
      }
    } else {
      this._clients[client].send('{"id": ' + result.id + ', "error": true, "payload": { "message": "Could not authenticate"}}');
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
    console.log(this);
    client.on("message", function (msg) {
      let message = JSON.parse(msg);
      self._handleMessage(client, message);
    });
  }
}