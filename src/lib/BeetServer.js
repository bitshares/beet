import BeetAPI from './BeetAPI';
import BeetWS from './BeetWS';
import CryptoJS from 'crypto-js';
import store from '../store/index.js';
//import eccrypto from 'eccrypto';
import { ec as EC } from "elliptic"; 
var ec = new EC('curve25519');
import RendererLogger from "./RendererLogger";

const logger = new RendererLogger();

let vueInst = null;

const linkHandler = async (req) => {
    try {
        let userResponse = await BeetAPI.handler(Object.assign(req, {}), vueInst);
        
        if (!!userResponse.response && !userResponse.response.isLinked) {
            return {
                id: req.id,
                result: {
                    isError: true,
                    error: 'User rejected request'
                }
            };
        } else {
            let identityhash = CryptoJS.SHA256(req.browser + ' ' + req.origin + ' ' + req.appName + ' ' + userResponse.identity.chain + ' ' + userResponse.identity.id).toString();
            let appcheck=store.state.OriginStore.apps.filter(x => x.identityhash==identityhash);
            let existing;
            let response;
            if (appcheck.length==0) {
                let secret = req.key.derive(ec.keyFromPublic(req.payload.pubkey, 'hex').getPublic());
                let app = await store.dispatch('OriginStore/addApp', {
                    appName: req.appName,
                    identityhash: identityhash,
                    origin: req.origin,
                    account_id: userResponse.identity.id,
                    chain: userResponse.identity.chain,
                    secret: secret.toString(16),
                    next_hash: req.payload.next_hash
                });
                existing=false;
                response = Object.assign(req, {
                    isLinked: true,
                    identityhash: identityhash,
                    chain: userResponse.identity.chain,
                    next_hash: req.payload.next_hash,
                    account_id: userResponse.identity.id,
                    secret: secret.toString(16),
                    existing: existing
                });
            }else{
                existing=true;
                response = Object.assign(req, {
                    isLinked: true,
                    identityhash: identityhash,
                    chain: userResponse.identity.chain,
                    next_hash: appcheck.next_hash,
                    account_id: userResponse.identity.id,
                    secret: appcheck.secret,
                    existing: existing
                });
            }
            
            return response;
        }
    } catch (err) {
        return {
            id: req.id,
            result: {
                isError: true,
                error: 'Error occurred: ' + err
            }
        };
    }
};

const authHandler = function (req) {
    // TODO: Check against blacklist;
    if (req.payload.identityhash != null & req.payload.identityhash != undefined) {
        let apps = store.state.OriginStore.apps;
        const app = apps.find(x => x.identityhash === req.payload.identityhash);
        if (!app) {
            return Object.assign(req.payload, {
                authenticate: false,
                link: false
            });
        } else {
            if (req.payload.origin == app.origin && req.payload.appName == app.appName) {
                return Object.assign(req.payload, {
                    authenticate: true,
                    link: true,
                    app: app
                });
            } else {
                return Object.assign(req.payload, {
                    authenticate: false,
                    link: false
                });
            }
        }
    } else {
        return Object.assign(req.payload, {
            authenticate: true,
            link: false
        });
    }
};

export default class BeetServer {

    static initialize(vue) {
        vueInst = vue;
        const server = new BeetWS(60555,60556, 10000);
        server.on('link', async (data) => {

            let status = await linkHandler(data);
            server.respondLink(data.client, status);
        });
        server.on('authenticate', async (data) => {
            let status = await authHandler(data);
            status.id = data.id;
            server.respondAuth(data.client, status);
        });
        server.on('api', async (data) => {
            store.dispatch('OriginStore/newRequest', {
                identityhash: data.payload.identityhash,
                next_hash: data.payload.next_hash
            });
            let status = await BeetAPI.handler(data, vueInst);
            status.id = data.id;
            server.respondAPI(data.client, status);
        });
    }
}