import BeetAPI from './BeetAPI';
import BeetWS from './BeetWS';
import CryptoJS from 'crypto-js';
import store from './store/index.js';

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
       userResponse = await BeetAPI.handler(Object.assign(req.data, {}), vueInst);
       store.dispatch('OriginStore/addApp', {appname:req.data.appname , apphash: req.data.appid , origin: req.data.origin, account_id: userResponse.id, nonce: 0});
       let key=CryptoJS.SHA256(req.data.appid+' '+userResponse.id).toString();

       return  { isLinked: true, counter: 0 , sharedKey: key, identity: userResponse };
    }catch(e) {
        
    }
};

const authHandler = async (req) => {
   
    let key=CryptoJS.SHA256(req.data.appid+' '+req.data.account_id).toString()
    
    return  {isLinked: true, counter: 1 , sharedKey: key};
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
            console.log(status);
            let result={};
            result.original=data.data.data;
            result.response=status;
            result.id=data.id;
            server2.respondAuth(data.client, result);
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