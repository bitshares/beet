import Dexie from 'dexie';
const BeetDB = new Dexie('BeetDB');

BeetDB.version(1).stores({
    apps: `++id, appName, origin, &apphash, account_id, chain, secret, next_hash`,
    settings: `++id, setting, value`,
    wallets_public: `&id, name, chain, accounts`,
    wallets_encrypted: `&id, data`
});

export default BeetDB;