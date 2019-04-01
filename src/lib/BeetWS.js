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
import {
    ec as EC
} from "elliptic";
import RendererLogger from "./RendererLogger";
const logger = new RendererLogger();

var ec = new EC('curve25519');
/*
import RendererLogger from "./RendererLogger";
const logger = new RendererLogger();
*/
export default class BeetWS extends EventEmitter {
    constructor(port, sslport, timeout) {
        super() // required
        var self = this;
        const httpsServer = Https.createServer({
            key: Fs.readFileSync(__dirname + '/ssl/beet.key'),
            cert: Fs.readFileSync(__dirname + '/ssl/beet.cert')
        });
        const server = new WebSocket.Server({
            server: httpsServer
        });
        const plainserver = new WebSocket.Server({
            port: port
        });
        httpsServer.listen(sslport);
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
        plainserver.on("connection", (client) => {
            self._handleConnection(client);
        });
    }

    noop() {

    }

    _heartbeat() {
        this.isAlive = true;
    }

    _handleMessage(client, data) {
        console.groupCollapsed("incoming request: " + data.type);
        console.log("payload", data);
        switch(data.type) {
            case 'version':
                client.send('{ "type": "version", "error": false, "result": { "version": ' + JSON.stringify(version) + '}}');
                break;
            case 'api':
                if (client.isAuthenticated) {
                    if (client.isLinked) {
                        if (hash == client.next_hash) {
                            client.otp.counter = data.id;
                            var key = client.otp.generate();
                            try {
                                var msg = JSON.parse(CryptoJS.AES.decrypt(data.payload, key).toString(CryptoJS.enc.Utf8));

                                msg.origin = client.origin;
                                msg.appName = client.appName;
                                msg.identityhash = client.identityhash;
                                msg.chain = client.chain;
                                msg.account_id = client.account_id;
                                client.next_hash = msg.next_hash;
                                let event = {
                                    "client": client.id,
                                    "id": data.id,
                                    "type": msg.method,
                                    "payload": msg
                                };
                                console.log("requesting user response", event);
                                this.emit('api', event);
                            } catch (e) {
                                client.send('{ "id": "' + data.id + '", "error": true, "payload": { "code": 3, "message": "Could not decrypt message"}}');
                            }
                        } else {
                            client.send('{ "id": "' + data.id + '", "error": true, "payload": { "code":2,"message": "Unexpected request hash. Please relink"}}');
                        }
                    }else{                        
                        client.send('{ "id": "' + data.id + '", "error": true, "payload": { "code":4, "message": "This app is not yet linked"}}')
                    }
                }else{                    
                    client.send('{ "id": "' + data.id + '", "error": true, "payload": { "code":5, "message": "Must authenticate first"}}');
                }
                break;
            case 'link':
                if (client.isAuthenticated) {
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
                    console.log("requesting user response", linkobj);
                    this.emit('link', linkobj);
                }else{                    
                    client.send('{ "id": "' + data.id + '", "error": true, "payload": { "code":5, "message": "Must authenticate first"}}');
                }
                break;
            case 'relink':
                if (client.isAuthenticated) {
                   
                    client.isLinked = false;
                    let linkobj = {
                        "id": data.id,
                        "client": client.id,
                        "payload": data.payload,
                        "chain": data.payload.chain,
                        "origin": client.origin,
                        "appName": client.appName,
                        "browser": client.browser,
                        "key": client.keypair,
                        "type": 'relink'
                    };
                    console.log("requesting user response", linkobj);
                    this.emit('relink', linkobj);
                }else{                    
                    client.send('{ "id": "' + data.id + '", "error": true, "payload": { "code":5, "message": "Must authenticate first"}}');
                }
                break;
            case 'authenticate':
                let event = {
                    "id": data.id,
                    "client": client.id,
                    "payload": data.payload
                };
                console.log("requesting user response", event);
                this.emit('authenticate', event);
            
                break;
            default:               
                client.send('{ "id": "' + data.id + '", "error": true, "payload": { "code":1, "message": "Beet could not understand your request"}}');               
                break;
        }
        console.groupEnd();
    }

    respondLink(client, result) {
        if (result.isLinked == true || result.link == true) {
            // link has successfully established
            this._establishLink(
                client,
                result
            );
        }
        this._clients[client].send(this._getLinkResponse(result));
    }

    respondReLink(client, result) {
        if (result.isLinked == true || result.link == true) {
            // link has successfully established
            this._establishLink(
                client,
                result
            );
        }
        this._clients[client].send(this._getLinkResponse(result));
    }
    _establishLink(client, target) {
        this._clients[client].isLinked = true;
        this._clients[client].identityhash = target.identityhash;
        this._clients[client].account_id = target.app.account_id;
        this._clients[client].chain = target.app.chain;
        this._clients[client].next_hash = target.app.next_hash;
        this._clients[client].otp = new OTPAuth.HOTP({
            issuer: "Beet",
            label: "BeetAuth",
            algorithm: "SHA1",
            digits: 32,
            counter: 0,
            secret: OTPAuth.Secret.fromHex(target.app.secret)
        });
    }

    _getLinkResponse(result) {
        let response = null;
        // todo: unify! isLinked comes from linkHandler, link from authHandler.

        if (result.isLinked == true || result.link == true) {
            if (result.app) {
                response = {
                    id: result.id,
                    error: false,
                    payload: {
                        authenticate: true,
                        link: true,
                        chain: result.chain,
                        existing: result.existing,
                        identityhash: result.identityhash,
                        requested: {
                            account: {
                                name: result.app.account_name,
                                id: result.app.account_id
                            }
                        }
                    }
                };
            } else {
                response = {
                    id: result.id,
                    error: false,
                    payload: {
                        authenticate: true,
                        link: true,
                        chain: result.identity.chain,
                        existing: result.existing,
                        identityhash: result.identityhash,
                        requested: {
                            account: {
                                name: result.identity.name,
                                id: result.identity.id
                            }
                        }
                    }
                };
            }
        } else {
            response = {
                id: result.id,
                error: true,
                payload: {
                    code: 6,
                    message: "Could not link to Beet"
                }
            };
        }
        return JSON.stringify(response);
    }

    respondAPI(client, response) {
        this._clients[client].otp.counter = response.id;
        var key = this._clients[client].otp.generate();
        var payload = CryptoJS.AES.encrypt(JSON.stringify(response.result), key).toString();
        this._clients[client].send('{"id": ' + response.id + ', "error": ' + !!response.result.isError + ' , "encrypted": true, "payload": "' + payload + '"}');
    }

    respondAuth(client, result) {
        if (result.authenticate) {
            this._clients[client].isAuthenticated = true;
            this._clients[client].origin = result.origin;
            this._clients[client].appName = result.appName;
            this._clients[client].browser = result.browser;
            if (result.link) {
                this.respondLink(client, result);
            } else {
                let keypair = ec.genKeyPair();
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