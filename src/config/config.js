let _blockchains = {
    BTS: {
        coreSymbol: 'BTS',
        name: 'BitShares',
        chainId: '4018d7844c78f6a6c41c6a552b898022310fc5dec06da467ee7905a8dad512c8',
        nodeList: [
            {
                url: "wss://bts.proxyhosts.info/wss",
                region: "Western Europe",
                country: "Germany",
                operator: "Infrastructure Worker",
                contact: "email:info@blockchainprojectsbv.com"
            },
            {
                url: "wss://bts-seoul.clockwork.gr",
                region: "Southeastern Asia",
                country: "Korea",
                location: "Seoul",
                operator: "Witness: clockwork",
                contact: "telegram:clockworkgr"
            },
            {
                url: "wss://bitshares.openledger.info/ws",
                location: "Nuremberg",
                region: "Western Europe",
                country: "Germany",
                operator: "Witness: openledger-dc",
                contact: "telegram:mtopenledger"
            },
            {
                url: "wss://openledger.hk/ws",
                region: "Southeastern Asia",
                country: "Singapore",
                operator: "Witness: openledger-dc",
                contact: "telegram:mtopenledger"
            },
            {
                url: "wss://na.openledger.info/ws",
                location: "Quebec",
                region: "Northern America",
                country: "Canada",
                operator: "Witness: openledger-dc",
                contact: "telegram:mtopenledger"
            },
            {
                url: "wss://bitshares.nu/ws",
                location: "Stockholm",
                region: "Northern Europe",
                country: "Sweden"
            },
            {
                url: "wss://bit.btsabc.org/ws",
                region: "Eastern Asia",
                country: "China",
                location: "Hong Kong",
                operator: "Witness: abc123",
                contact: "QQ:58291;email:58291@qq.com"
            },
            {
                url: "wss://node.btscharts.com/ws",
                region: "Eastern Asia",
                country: "China",
                location: "Beijing",
                operator: "leo2017",
                contact: "wechat:wx8855221;email:8855221@qq.com"
            },
            {
                url: "wss://japan.bitshares.apasia.tech/ws",
                country: "Japan",
                region: "Southeastern Asia",
                operator: "APAsia",
                contact: "telegram:murda_ra"
            },
            {
                url: "wss://bitshares.crypto.fans/ws",
                region: "Western Europe",
                country: "Germany",
                location: "Munich",
                operator: "Witness: sc-ol",
                contact: "telegram:startail"
            },
            {
                url: "wss://ws.gdex.top",
                region: "Eastern Asia",
                country: "China",
                location: "Shanghai",
                operator: "Witness: gdex-witness",
                contact: "telegram:BrianZhang"
            },
            {
                url: "wss://dex.rnglab.org",
                location: "Netherlands",
                operator: "Witness: rnglab"
            },
            {
                url: "wss://la.dexnode.net/ws",
                region: "Northern America",
                country: "U.S.A.",
                location: "Los Angeles",
                operator: "Witness: Sahkan",
                contact: "telegram:Sahkan_bitshares"
            },
            {
                url: "wss://dexnode.net/ws",
                region: "Northern America",
                country: "U.S.A.",
                location: "Dallas",
                operator: "Witness: Sahkan",
                contact: "telegram:Sahkan_bitshares"
            },
            {
                url: "wss://kc-us-dex.xeldal.com/ws",
                region: "North America",
                country: "U.S.A.",
                location: "Kansas City",
                operator: "Witness: xeldal",
                contact: "telegram:xeldal"
            },
            {
                url: "wss://btsza.co.za:8091/ws",
                location: "Cape Town, South Africa"
            },
            {
                url: "wss://api.bts.blckchnd.com",
                region: "Western Europe",
                country: "Germany",
                location: "Falkenstein",
                operator: "Witness: blckchnd",
                contact: "email:admin@blckchnd.com;telegram:ruslansalikhov;github:blckchnd"
            },
            {
                url: "wss://api-ru.bts.blckchnd.com",
                region: "Eastern Europe",
                country: "Russia",
                location: "Moscow",
                operator: "Witness: blckchnd",
                contact: "email:admin@blckchnd.com;telegram:ruslansalikhov;github:blckchnd"
            },
            {
                url: "wss://node.market.rudex.org",
                region: "Western Europe",
                country: "Germany",
                location: "Falkenstein",
                operator: "Witness: blckchnd",
                contact: "email:admin@blckchnd.com;telegram:ruslansalikhov;github:blckchnd"
            },
            {
                url: "wss://api.bitsharesdex.com",
                region: "Northern America",
                country: "U.S.A.",
                location: "Kansas City",
                operator: "Witness: delegate.ihashfury",
                contact: "telegram:ihashfury"
            },
            {
                url: "wss://api.fr.bitsharesdex.com",
                region: "Western Europe",
                country: "France",
                location: "Paris",
                operator: "Witness: delegate.ihashfury",
                contact: "telegram:ihashfury"
            },
            {
                url: "wss://blockzms.xyz/ws ",
                region: "North America",
                country: "U.S.A.",
                location: "New Jersey",
                operator: "Witness: delegate-zhaomu",
                contact: "telegram:lzmlam;wechat:lzmlam"
            },
            {
                url: "wss://us.nodes.bitshares.ws",
                region: "North America",
                country: "U.S.A.",
                operator: "Infrastructure Worker",
                contact: "email:info@blockchainprojectsbv.com"
            },
            {
                url: "wss://sg.nodes.bitshares.ws",
                region: "Southeastern Asia",
                country: "Singapore",
                operator: "Infrastructure Worker",
                contact: "email:info@blockchainprojectsbv.com"
            },
            {
                url: "wss://ws.winex.pro",
                region: "Southeastern Asia",
                location: "Singapore",
                operator: "Witness: winex.witness",
                contact: "telegram:zmaxin"
            },
            {
                url: "wss://api.bts.mobi/ws",
                region: "Northern America",
                country: "U.S.A.",
                location: "Virginia",
                operator: "Witness: in.abit",
                contact: "telegram:abitmore"
            },
            {
                url: "wss://api.btsxchng.com",
                location: "Global (Asia Pacific (Singapore) / US East (N. Virginia) / EU (London))",
                operator: "Witness: elmato"
            },
            {
                url: "wss://api.bts.network/",
                region: "North America",
                country: "U.S.A.",
                location: "Virginia",
                operator: "Witness: fox",
                contact: "telegram:ryanRfox"
            },
            {
                url: "wss://btsws.roelandp.nl/ws",
                region: "Northern Europe",
                country: "Finland",
                location: "Helsinki",
                operator: "Witness: roelandp",
                contact: "telegram:roelandp"
            },
            {
                url: "wss://api.bitshares.bhuz.info/ws",
                region: "Northern America",
                country: "Canada",
                operator: "Witness: bhuz",
                contact: "telegram:bhuzor"
            },
            {
                url: "wss://bts-api.lafona.net/ws",
                region: "Northern America",
                country: "Canada",
                location: "Montreal",
                operator: "Witness: delegate-1.lafona",
                contact: "telegram:lafona"
            },
            {
                url: "wss://kimziv.com/ws",
                region: "North America",
                country: "U.S.A.",
                location: "New Jersey",
                operator: "Witness: witness.yao",
                contact: "telegram:imyao"
            },
            {
                url: "wss://api.btsgo.net/ws",
                region: "Asia",
                location: "Singapore",
                operator: "Witness: xn-delegate",
                contact: "wechat:Necklace"
            },
            {
                url: "wss://bts.proxyhosts.info/wss",
                location: "Germany",
                operator: "Witness: verbaltech2"
            },
            {
                url: "wss://bts.open.icowallet.net/ws",
                region: "Eastern Asia",
                country: "China",
                location: "Hangzhou",
                operator: "Witness: magicwallet.witness",
                contact: "telegram:plus_wave"
            },
            {
                url: "wss://crazybit.online",
                region: "Asia",
                country: "China",
                location: "Shenzhen",
                operator: "Witness: crazybit",
                contact: "telegram:crazybits;wechat:JamesCai"
            },
            {
                url: "wss://freedom.bts123.cc:15138/",
                region: "South China",
                country: "China",
                location: "Changsha",
                operator: "Witness: delegate.freedom",
                contact: "telegram:eggplant"
            },
            {
                url: "wss://bitshares.bts123.cc:15138/",
                region: "North China",
                country: "China",
                location: "Hangzhou",
                operator: "Witness: delegate.freedom",
                contact: "telegram:eggplant"
            },
            {
                url: "wss://api.bts.ai",
                region: "Eastern Asia",
                country: "China",
                location: "Beijing",
                operator: "Witness: witness.hiblockchain",
                contact: "telegram:vianull;wechat:strugglingl"
            },
            {
                url: "wss://ws.hellobts.com",
                region: "Eastern Asia",
                country: "Japan",
                location: "Tokyo",
                operator: "Witness: xman",
                contact: "wechat:hidpos;email:hellobts@qq.com"
            },
            {
                url: "wss://bitshares.cyberit.io",
                region: "Eastern Asia",
                country: "China",
                location: "Hong Kong",
                operator: "Witness: witness.still",
                contact: "telegram:gordoor;wechat:overyard"
            },
            {
                url: "wss://bts.to0l.cn:4443/ws",
                region: "Eastern Asia",
                country: "China",
                location: "Shandong",
                operator: "Witness: liuye",
                contact: "email:work@liuye.tech"
            },
            {
                url: "wss://btsfullnode.bangzi.info/ws",
                region: "Western Europe",
                country: "Germany",
                location: "Munich",
                operator: "Witness: Bangzi",
                contact: "telegram:Bangzi"
            },
            {
                url: "wss://api.dex.trading/",
                region: "Western Europe",
                country: "France",
                location: "Paris",
                operator: "Witness: zapata42-witness",
                contact: "telegram:Zapata_42"
            },
            {
                url: "wss://node.bitshares.eu",
                location: "Nuremberg",
                region: "Western Europe",
                country: "Germany",
                operator: "ChainSquad GmbH (xeroc)",
                contact: "info@chainsquad.com"
            }
        ]
    },
    BTS_TEST: {
        coreSymbol: 'BTS',
        name: 'BitShares',
        testnet: true,
        chainId: '39f5e2ede1f8bc1a3a54a7914414e3779e33193f1f5693510e73cb7a87617447',
        nodeList: [
            {
                url: "wss://eu.nodes.bitshares.ws",
                region: "Western Europe",
                country: "Germany",
                operator: "Infrastructure Worker",
                contact: "email:info@blockchainprojectsbv.com"
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
