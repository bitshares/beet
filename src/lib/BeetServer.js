import BeetAPI from './BeetAPI';
import BeetWS from './BeetWS';
import CryptoJS from 'crypto-js';
import store from '../store/index.js';
import eccrypto from 'eccrypto';
import RendererLogger from "./RendererLogger";

const logger=new RendererLogger();

let io = null;
let vueInst = null;
const socketHandler = (socket) => {

    // TODO: Testing the event system.
    // Events are sent to the plugins to notify them of changes
    // such as identity changes, key removals, account un-linking
    // and scatter being locked.
    // setInterval(() => {
    //     if(authenticated)
    //         socket.emit('event', 'evented');
    // }, 2000);


    // When something connects we automatically
    // notify it of a successful connection
    //socket.emit('connected',version);
    //let authorized=await vueInst.authorize(req);
    //if (authorized) {
    // All authenticated api requests pass through the 'api' route.
    socket.on('api', async req => {
        socket.emit('api', await BeetAPI.handler(Object.assign(req.data, {
            plugin: req.plugin
        }), vueInst));
    });
    socket.on('link', async req => {
        //TODO
        //socket.emit('link',await vueInst.)
    })
    socket.on('disconnect', () => {

    });
    //    }else{
    //        socket.disconnect();
    //    }
};

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
        let apps=store.state.OriginStore.apps;        
        const app = apps.find(x => x.apphash === req.payload.apphash);
        if (!app) {          
            return Object.assign(req.payload, {
                authenticate: false,
                link: false
            });  
        }else{
            logger.log(req);
            logger.log(app);
            if (req.payload.origin==app.origin && req.payload.appName==app.appName)  {
                return Object.assign(req.payload, {
                    authenticate: true,
                    link: true,
                    app: app
                });
            }else{
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
        const server = window.require('http').createServer();
        server.listen(60555, 'localhost');
        const server2 = new BeetWS(60556, 10000);
        io = window.require('socket.io').listen(server);
        logger.log('Beet listening...');
        server2.on('link', async (data) => { 
            
            let status = await linkHandler(data);
            logger.log(status);
            server2.respondLink(data.client, status);
        });
        server2.on('authenticate', async (data) => {
            let status = await authHandler(data);
            status.id = data.id;
            server2.respondAuth(data.client, status);
        });
        server2.on('api', async (data) => {
            store.dispatch('OriginStore/newRequest', {
                apphash: data.payload.apphash,
                next_hash: data.payload.next_hash
            });
            let status = await BeetAPI.handler(data, vueInst);
            logger.log(status);
            status.id = data.id;
            server2.respondAPI(data.client, status);
        });
    }

    static open() {
        const namespace = io.of(`/btscompanion`);
        namespace.on('connection', socket => {
            socketHandler(socket);
        })
    }

    static close() {
        // Getting namespace
        const socket = io.of(`/btscompanion`);

        // Disconnecting all active connections to this namespace
        Object.keys(socket.connected).map(socketId => {
            socket.connected[socketId].disconnect();
        });

        // Removing all event emitter listeners.
        socket.removeAllListeners();

        // Deleting the namespace from the array of
        // available namespaces for connections
        delete io.nsps[`/btscompanion`];
    }

}