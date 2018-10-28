import BeetAPI from './BeetAPI';
import BeetWS from './BeetWS';
import CryptoJS from 'crypto-js';
import store from '../store/index.js';
import eccrypto from 'eccrypto';
import RendererLogger from "./RendererLogger";

const logger = new RendererLogger();

let vueInst = null;

const linkHandler = async (req) => {
    let userResponse;
    try {
        logger.log(req);
        userResponse = await BeetAPI.handler(Object.assign(req, {}), vueInst);
        logger.log(userResponse);
        let apphash = CryptoJS.SHA256(req.browser + ' ' + req.origin + ' ' + req.appName + ' ' + req.payload.chain + ' ' + userResponse.identity.id).toString();
        logger.log(req.browser + ' ' + req.origin + ' ' + req.appName + ' ' + req.payload.chain + ' ' + userResponse.identity.id);
        let secret = await eccrypto.derive(req.key, Buffer.from(req.payload.pubkey, 'hex'));
        store.dispatch('OriginStore/addApp', {
            appName: req.appName,
            apphash: apphash,
            origin: req.origin,
            account_id: userResponse.identity.id,
            chain: req.payload.chain,
            secret: secret.toString('hex'),
            next_hash: req.payload.next_hash
        });
        let response = Object.assign(req, {
            isLinked: true,
            apphash: apphash,
            chain: req.payload.chain,
            next_hash: req.payload.next_hash,
            account_id: userResponse.identity.id,
            secret: secret.toString('hex')
        });
        return response;
    } catch (e) {
        logger.log(e);
    }
};

const authHandler = async (req) => {

    // TODO: Check against blacklist;    
    if (req.payload.apphash != null & req.payload.apphash != undefined) {
        let apps = store.state.OriginStore.apps;
        const app = apps.find(x => x.apphash === req.payload.apphash);
        if (!app) {
            return Object.assign(req.payload, {
                authenticate: false,
                link: false
            });
        } else {
            logger.log(req);
            logger.log(app);
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
        const server = new BeetWS(60556, 10000);
        logger.log('Beet listening...');
        server.on('link', async (data) => {

            let status = await linkHandler(data);
            logger.log(status);
            server.respondLink(data.client, status);
        });
        server.on('authenticate', async (data) => {
            let status = await authHandler(data);
            status.id = data.id;
            server.respondAuth(data.client, status);
        });
        server.on('api', async (data) => {
            store.dispatch('OriginStore/newRequest', {
                apphash: data.payload.apphash,
                next_hash: data.payload.next_hash
            });
            let status = await BeetAPI.handler(data, vueInst);
            logger.log(status);
            status.id = data.id;
            server.respondAPI(data.client, status);
        });
    }
}