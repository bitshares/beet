import Dexie from 'dexie';
const BeetDB = new Dexie('BeetDB');

BeetDB.version(1).stores({
    apps: `++id,name, wallet, domain, origin, pkey, nonce`,
    settings: `++id,setting, value`
}); 

export default BeetDB;