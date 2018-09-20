import EventEmitter from 'events';
import {version} from '../config/config';
import WebSocket from 'ws';
import {
  v4 as uuidv4
} from 'uuid'
import OTPAuth from 'otpauth';
import CryptoJS from "crypto-js";

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
        if (client.isAlive === false) {
          self.emit('disconnected', client.id);
          delete(self._clients[client.id]);
          return client.terminate();
        } else {
          client.isAlive = false;
          client.ping(self.noop);
        }
      }
    }, timeout);
    console.log(self);
    server.on('connection', (client) => {
      self._handleConnection(client);
    });
  }
  noop() {

  }
  _heartbeat() {
    this.isAlive = true;
  }
  _handleMessage(client, data) {
    if (client.isAuthenticated) {
      if (client.isLinked) {
        if (data.type == 'api') {
          var key = client.otp.generate();
          if (key == data.nonce) {
            try {
              var msg = CryptoJS.AES.decrypt(data.payload, key).toString(CryptoJS.enc.Utf8);
              this.emit('api', {
                "client": client.id,
                "id": data.id,
                "payload": msg
              });
            } catch (e) {
              client.send("{'id': " + data.id + ", 'result': 'error' , 'data': 'Could not decrypt message'}");
            }
          } else {
            client.send("{'id': " + data.id + ", 'result': 'error' , 'data': 'Unexpected nonce. Please relink.'}");
          }
        } else {
          client.send("{'id': " + data.id + ", 'result': 'error' , 'data': 'Beet could not understand your request'}");
        }
      } else {
        if (data.type == 'link') {
          this.emit('link', {
            "client": client.id,
            "data": data
          });
        } else {
          client.send("{'id': " + data.id + ", 'result': 'error' , 'data': 'This app is not yet linked'}");
        }
      }
    } else {
      if (data.type == 'authenticate') {
        this.emit('authenticate', {
          "client": client.id,
          "data": data
        });
      } else {
        if (data.type=='version') {
          console.log(version);
          client.send('{ "type": "version", "result": '+JSON.stringify(version)+"}");
        }else{
          client.send("{'id': " + data.id + ", 'result': 'error' , 'data': 'Must authenticate first'}");
        }
      }
    }
  }
  respondLink(client, data) {
    if (data.response.isLinked == true) {
      let otp = new OTPAuth.HOTP({
        issuer: 'Beet',
        label: 'BeetAuth',
        algorithm: 'SHA1',
        digits: 32,
        counter: data.response.counter,
        secret: OTPAuth.Secret.fromB32(data.response.sharedKey)
      });
      this._clients[client].otp = otp;
      this._clients[client].isLinked = true;
      this._clients[client].send("{'id': " + data.id + ", 'result': 'success' , 'data': " + JSON.stringify(data.response) + "}");
    } else {
      this._clients[client].send("{'id': " + data.id + ", 'result': 'error' , 'data': 'Could not link to Beet'}");
    }
  }
  respondAPI(client, data) {

    var key = this._clients[client].otp.generate();
    var payload = CryptoJS.AES.encrypt(JSON.stringify(data.response), key).toString();
    this._clients[client].send("{'id': " + data.id + ", 'result': 'success' , 'data': '" + payload + "', 'nonce': '" + key + "'}");
  }
  authGranted(client, data) {
    this._clients[client].isAuthenticated = true;
    if (data.response.isLinked == true) {
      let otp = new OTPAuth.HOTP({
        issuer: 'Beet',
        label: 'BeetAuth',
        algorithm: 'SHA1',
        digits: 32,
        counter: data.response.counter,
        secret: OTPAuth.Secret.fromB32(data.response.sharedKey)
      });
      this._clients[client].otp = otp;
      this._clients[client].isLinked = true;
    }
    this._clients[client].send("{'id': " + data.id + ", 'result': 'success' , 'data': " + JSON.stringify(data.response) + "}");
  }
  authRejected(client, data) {
    this._clients[client].send("{'id': " + data.id + ", 'result': 'error' , 'data': " + JSON.stringify(data.response) + "}");
  }
  _handleConnection(client) {
    client.id = uuidv4();
    client.isAlive = true;
    client.isAuthenticated = false;
    let self = this;
    client.on('pong', this._heartbeat);
    this._clients[client.id] = client;
    this.emit('connected', client.id);
    console.log(this);
    client.on('message', function (msg) {
      let message = JSON.parse(msg);
      self._handleMessage(client, message);
    });
  }
}