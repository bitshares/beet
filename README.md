# Introduction

Interacting with any blockchain can be cumbersome if you are not familiar with how a blockchain works (private keys and signatures) and
haven't dug through the plentiful features that each blockchain offers. In general, every action on a blockchain requires a cryptographic signature of the required private keys of the action,
and when you are using third party tools (especially closed source ones), the question about trust quickly arises ("Are they gonna steal my private keys?"). Being closed source can be a business model,
but should not hinder adoption. Beet aims to solve that, while additionally facilitating private key managament for the everyday user.

A general rule of thumb for the inexperienced: Never ever expose your private keys on the internet, and if that is ever needed, stay vigilant and do your due diligence.

# Beet - Your blockchain companion

Beet is a stand-alone key and identity manager and signing app for blockchains, originally evolved from the BitShares Blockchains and influenced by Scatter (https://get-scatter.com/).
Beet is installed locally on your computer. It allows separate account management while being in full control of what data to expose to third parties.
Private keys are locally stored and encrypted, protected by a wallet master password. All transactions suggested by third parties must be confirmed before being broadcast.

Telegram channel: https://t.me/beetapp

## Features / User Guide

On first run, you will be prompted to create a new wallet to hold your keys. You pick a name for the wallet,
enter your first account / address (in the case of BitShares that is the account name, active and memo private keys) and select a password to protect your wallet (AES encrypted). You can add several accounts
of different chains to one wallet.

The app will generate your public keys from those private keys and verify them against the ones stored on-chain for the account name / address you provided. Depending on the blockchain you are adding different import options are available.

Once your keys and account are verified, you will be redirected to the dashboard view which currently displays your account details and balances.

While logged-in, Beet exposes a websocket API **LOCALLY** that can only be accessed by applications running on your computer (internet browser or any other third party application installed on your computer),
as long as it includes our client-side javascript library [BeetJS](https://github.com/bitshares/beet-js).

BeetJS allows any web-page to send requests to Beet in order to retrieve identity (account id / address) or ask for an action to be taken (sign a transaction, vote or others).
Of-course, any incoming request has to be **explicitly** approved by the user inside the Beet app and is clearly displayed.

Many blockchains have their native
javascript library that can be used
(e.g. [bitcoinjs](https://github.com/bitcoinjs/bitcoinjs-lib) for the Bitcoin blockchain,
[bitsharesjs](https://github.com/bitshares/bitsharesjs) for the BitShares Blockchain or [eosjs](https://github.com/EOSIO/eosjs) for EOSIO blockchains). BeetJS allows to inject itself into such a native library
which automatically redirect all signature and broadcast requests to Beet, i.e. you can simply use the native javascript library and inject BeetJS when starting your application, and voila, Beet is integrated.

The app lives on your system tray and will only quit if explicitly done via right-click on the system tray icon. While minimized it will provide balloon notifications when requests are made to prompt the user to take action.

## For end users

Releases are bundled as installers for OS X, Windows and Linux (Snap included) and are available at https://github.com/bitshares/beet/releases.

    ATTENTION

Beet binaries will never be hosted anywhere but within GitHub releases. If you find Beet binaries anywhere else, it is likely a phishing attempt.

## For developers

Beet is an electron-based app for cross-platform compatibility, utilising the VueJS framework, Bootstrap CSS framework and the socket.io libraries.

To run Beet it's simply a case of

``` bash
# clone
git clone git@github.com:bitshares/beet.git
cd beet

# install dependencies
npm install

# start Beet
npm run start
```

If you are in linux you may need to do: `sudo apt-get install libudev-dev` before start Beet.

## Supported apps and web pages

 - Voting Showcase www.bitsharesvotes.com
 - Inter-blockchain communication via Beet Trollbox www.bitsharesvotes.com

## Current Limitations

Beet currently only supports single-sig accounts (one private key to unlock the blockchain action), and depending on the blockchain different import options may be available.
Please open an issue to add support for your desired way.

## Funding

The development of Beet originated from within the
BitShares community and is currently funded through the [BitShares UI worker](https://www.bitshares.foundation/workers/2019-02-bitshares-ui) and is thus this dependant on it.
If said worker would go inactive there is no buffer available to further Beet development, and we are also bound to the restrictions of the worker (which is mainly to only fund development tasks).

We have plans for marketing and promotional campaigns for Beet which will bring massive synergetic effects for all blockchains involved. nevertheless, those plans our out-of-scope of the UI worker and are thus
on hold at the moment.

### Donations

If you like what we are doing and want to support us, donations are much welcomed and will be used to further Beet integration, adoption and development. Donations can be done to following
accounts / addresses

BitShares Blockchain

    Account Name: beet Id: 1.2.1152309

Bitcoin Blockchain

    Address: 1GquUmypi1mKg696qRsmM24xmgwVqGGMdA

### For businesses

You are running a business and want to facilitate the interaction of your users with a blockchain (e.g. paying subscription fees or purchases)?
Or maybe you simply have an idea for Beet?

Feel free to contact us directly and discuss opportunities. Best way is either through github, in our telegram channel https://t.me/beetapp or via carrier pigeon.

## Open milestones

The following are in no particular order and may or may not be picked up by us

 - Support Peerplays blockchain
 - Support BEOS blockchain
 - Support Ethereum blockchain
 - Support Hardware wallets (Ledger and Keybox in the making)
 - Localisation
 - Extra information & features on dashboard as needed
 - Port to mobile

# Can I trust this code?

    Don't trust. Verify!

We will pursue a code review and audit
by an external and independent party as soon as our budget allows to show that we take this serious.
In the meantime we recommend every user to audit and verify any underlying code for its validity and suitability,
including reviewing any and all of your project's dependencies.

    DISCLAIMER

Beet is in *BETA* stage and there is no guarantee of a bug free product. Beet is delivered as is in accordance to the MIT license.
There is no fear of your keys being exposed / compromised.

You are however welcome to try it out, submit bugs and feature requests as an issue.

