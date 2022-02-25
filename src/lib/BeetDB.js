import Dexie from 'dexie';
const BeetDB = new Dexie('BeetDB');

BeetDB.version(1).stores({
    apps: `++id, appName, origin, &identityhash, account_id, chain, secret, next_hash`,
    settings: `++id, setting, value`,
    wallets_public: `&id, name, accounts`,
    wallets_encrypted: `&id, data`,
    whitelistable: `++id,method`,
    whitelist: `++id,identityhash,method`
});

export default BeetDB;
