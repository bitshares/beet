import CompanionAPI from '../lib/CompanionAPI';

let io = null;
let vueInst=null;
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
    socket.emit('connected');
    //let authorized=await vueInst.authorize(req);
    //if (authorized) {
    // All authenticated api requests pass through the 'api' route.
    socket.on('api', async req => {
        console.log(req);
        socket.emit('api', await CompanionAPI.handler(Object.assign(req.data, {plugin:req.plugin}),vueInst));
    });

    socket.on('disconnect', () => {

    });
//    }else{
//        socket.disconnect();
//    }
};

export default class CompanionServer {

    static initialize(vue){
        vueInst=vue;
        const server = window.require('http').createServer();
        server.listen(60555, 'localhost');
        io = window.require('socket.io').listen(server);
        console.log('Listening');
    }

    static open(){
        const namespace = io.of(`/btscompanion`);
        namespace.on('connection', socket => {
            socketHandler(socket);
        })
    }

    static close(){
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