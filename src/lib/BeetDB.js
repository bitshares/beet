import Dexie from 'dexie';
const BeetDB = new Dexie('BeetDB');
 
BeetDB.version(1).stores({
    apps: `++id,appName, origin, &apphash, account_id, chain, secret,next_hash`,
    settings: `++id,setting, value`
}); 

export default BeetDB;