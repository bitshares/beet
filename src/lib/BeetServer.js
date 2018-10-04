import BeetAPI from './BeetAPI';
import BeetWS from './BeetWS';
import CryptoJS from 'crypto-js';
import store from '../store/index.js';
import eccrypto from 'eccrypto';

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
    socket.on('link',async req=> {
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
        console.log(req);
       userResponse = await BeetAPI.handler(Object.assign(req, {}), vueInst);
       console.log(userResponse);
       let apphash=CryptoJS.SHA256(req.browser + ' ' + req.origin + ' ' + req.appname+ ' '+req.payload.chain+' '+userResponse.identity.id).toString();    
       console.log(req.browser + ' ' + req.origin + ' ' + req.appname+ ' '+req.payload.chain+' '+userResponse.identity.id);
       let secret = await eccrypto.derive(req.key, Buffer.from(req.payload.pubkey,'hex'));
       store.dispatch('OriginStore/addApp', {appname:req.appname , apphash: apphash , origin: req.origin, account_id: userResponse.identity.id, chain: req.payload.chain, secret: secret.toString('hex'),next_hash:req.payload.next_hash});
       let response = Object.assign(req,  {isLinked: true, apphash: apphash,  account_id: userResponse.identity.id, secret: secret.toString('hex')});
       return response;
    }catch(e) {
        console.log(e);
    }
};

const authHandler = async (req) => {
   
    // TODO: Check against blacklist;    
    if (req.payload.apphash!=null & req.payload.apphash!=undefined) {
        return Object.assign(req.payload, {authenticate:true,link:true});
    }else{
        return Object.assign(req.payload, {authenticate:true,link:false});
    }
 };

export default class BeetServer {

    static initialize(vue) {
        vueInst = vue; 
        const server = window.require('http').createServer();
        server.listen(60555, 'localhost');
        const server2=new BeetWS(60556,10000);
        io = window.require('socket.io').listen(server);
        console.log('Beet listening...');
        server2.on('link',async (data)=> {
            let status=await linkHandler(data);
            console.log(status);
            server2.respondLink(data.client, status);
        });
        server2.on('authenticate',async (data)=> {
            let status=await authHandler(data);
            status.id=data.id;
            server2.respondAuth(data.client, status);
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