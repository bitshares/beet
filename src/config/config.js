let _blockchains = {
    BTS: {
        coreSymbol: 'BTS',
        name: 'BitShares',
        chainId: '4018d7844c78f6a6c41c6a552b898022310fc5dec06da467ee7905a8dad512c8',
        nodeList: [
            {
                url: "wss://eu.nodes.bitshares.ws"
            },
            {
                url: "wss://newyork.bitshares.im/ws"
            },
            {
                url: "wss://api.bts.mobi/ws"
            },
            {
                url: "wss://api.iamredbar.com/ws"
            },
            {
                url: "wss://nexus01.co.uk/ws"
            },
            {
                url: "wss://dex.iobanker.com/ws"
            },
            {
                url: "wss://node.xbts.io/ws"
            },
            {
                url: "wss://api.dex.trading/"
            },
            {
                url: "wss://api-bts.liondani.com/ws"
            },
            {
                url: "wss://api.bitshares.bhuz.info/ws"
            },
            {
                url: "wss://btsws.roelandp.nl/ws"
            }
        ]
    },
    BTS_TEST: {
        coreSymbol: 'TEST',
        name: 'BitShares',
        testnet: true,
        chainId: '39f5e2ede1f8bc1a3a54a7914414e3779e33193f1f5693510e73cb7a87617447',
        nodeList: [
            {
                url: "wss://testnet.xbts.io/ws"
            },
            {
                url: "wss://testnet.dex.trading/"
            },
            {
                url: "wss://api-testnet.61bts.com/ws"
            },
            {
                url: "wss://testnet.bitshares.im/ws"
            },
            {
                url: "https://eu.nodes.testnet.bitshares.ws/"
            }
        ]
    },
    STEEM: {
        coreSymbol: 'STM',
        name: 'Steem',
        chainId: '0',
        nodeList: [
            {
                url: "https://api.steemit.com/",
                location: "Unknown",
                region: "Unknown",
                country: "Unknown",
                operator: "Steemit Inc.",
                contact: "https://steem.com"
            }
        ]
    },
    WLS: {
        coreSymbol: 'WLS',
        name: 'WhaleShares',
        chainId: '0',
        nodeList: [
            {
                url: "https://wls.kennybll.com/",
                location: "Unknown",
                region: "Unknown",
                country: "Unknown",
                operator: "Beyond Bitcoin",
                contact: "Discord Channel"
            }
        ]
    },
    SMOKE: {
        coreSymbol: 'SMK',
        name: 'Smoke',
        chainID: '1ce08345e61cd3bf91673a47fc507e7ed01550dab841fd9cdb0ab66ef576aaf0',
        nodeList: [
            {
                url: 'https://rpc.smoke.io/',
                location: 'Unknown',
                region: 'Unkown',
                country: 'Unkown',
                operator: 'Smoke Holdings Ltd',
                contact: 'hello@smoke.network',
            },
            {
                url: 'http://pubrpc.smoke.io/',
                location: 'Unknown',
                region: 'Unkown',
                country: 'Unkown',
                operator: 'Smoke Holdings Ltd',
                contact: 'hello@smoke.network',
            },
        ]
    },
    EOS: {
        coreSymbol: 'EOS',
        name: 'EOSmainnet',
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
        nodeList: [
            {
                url: "https://eos.greymass.com",
                location: "Unknown",
                region: "Unknown",
                country: "Unknown",
                operator: "Greymass",
                contact: "Greymass"
            }
        ]
    },
    TLOS: {
        coreSymbol: 'TLOS',
        name: 'Telos',
        chainId: '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11',
        nodeList: [
            {
                url: "https://api.theteloscope.io",
                location: "Unknown",
                region: "Unknown",
                country: "Unknown",
                operator: "Greymass",
                contact: "Greymass"
            }
        ]
    },
    BTC: {
        coreSymbol: 'BTC',
        name: 'Bitcoin',
        chainId: null,
        nodeList: [
            {
                url: "https://blockchain.info/rawaddr/",
                push: "https://blockchain.info/pushtx",
                location: "Unknown",
                region: "Unknown",
                country: "Luxembourg",
                operator: "Blockchain Luxembourg S.A.",
                contact: "https://www.blockchain.com"
            }
        ]
    },
    BTC_TEST: {
        coreSymbol: 'BTC',
        name: 'Bitcoin',
        chainId: null,
        testnet: true,
        nodeList: [
            {
                url: "https://testnet.blockchain.info/rawaddr/",
                push: "https://testnet-api.smartbit.com.au/v1/blockchain/pushtx",
                location: "Unknown",
                region: "Unknown",
                country: "Luxembourg",
                operator: "Blockchain Luxembourg S.A.",
                contact: "https://www.blockchain.com"
            }
        ]
    },
    BNB_TEST: {
        coreSymbol: 'BNB',
        name: 'BinanceChain',
        testnet: true,
        chainId: 'Binance-Chain-Nile',
        nodeList: [
            {
                url: "https://testnet-dex.binance.org/",
                explorer: "https://testnet-explorer.binance.org/",
                location: "Unknown",
                region: "Unknown",
                country: "Unknown",
                operator: "Binance",
                contact: "Binance.org"
            }
        ]
    },
    BNB: {
        coreSymbol: 'BNB',
        name: 'BinanceChain',
        chainId: 'Binance-Chain-Tigris',
        nodeList: [
            {
                url: "https://dex.binance.org/",
                explorer: "https://explorer.binance.org/",
                location: "Unknown",
                region: "Unknown",
                country: "Unknown",
                operator: "Binance",
                contact: "Binance.org"
            }
        ]
    }
};

Object.keys(_blockchains).forEach(key => {
    _blockchains[key].identifier = key;
});

export const blockchains = _blockchains;
