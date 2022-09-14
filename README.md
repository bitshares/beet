# Introduction

Interacting with any blockchain can be cumbersome if you are not familiar with how a blockchain works (private keys and signatures) and haven't dug through the plentiful features that each blockchain offers.

In general, every action on a blockchain requires a cryptographic signature of the required private keys for the action, and when you are using third party tools (especially closed source ones), the question about trust quickly arises ("Are they gonna steal my private keys?").

Beet aims to solve these trust concerns, whilst additionally facilitating private key managament for the everyday user.

A general rule of thumb for the inexperienced: Never ever expose your private keys on the internet, and if that is ever needed, stay vigilant and do your due diligence.

# Beet - Your blockchain companion

Beet is a locally installed stand-alone key and identity manager and signing app for blockchains, originally evolved from the BitShares Blockchains and influenced by the [Scatter wallet](https://github.com/GetScatter).

Beet allows separate account management while being in full control of what data to expose to third parties.

Private keys are locally stored and encrypted, protected by a wallet master password.

All transactions suggested by third parties must be confirmed before being broadcast.

Telegram channel: https://t.me/beetapp

## Features / User Guide

On first run, you will be prompted to create a new wallet to hold your keys. You pick a name for the wallet,
enter your first account / address (in the case of BitShares that is the account name, active and memo private keys) and select a password to protect your wallet (AES encrypted). You can add several accounts
of different chains to one wallet.

The app will generate your public keys from those private keys and verify them against the ones stored on-chain for the account name / address you provided. Depending on the blockchain you are adding different import options are available.

Once your keys and account are verified, you will be redirected to the dashboard view which currently displays your account details and balances.

While logged-in, Beet exposes a socket.io server **LOCALLY** that can only be accessed by applications running on your computer (internet browser or any other third party application installed on your computer),
as long as it includes our client-side javascript library [BeetJS](https://github.com/bitshares/beet-js).

BeetJS allows any web-page to send requests to Beet in order to retrieve identity (account id / address) or ask for an action to be taken (sign a transaction, vote or others).
Of-course, any incoming request has to be **explicitly** approved by the user inside the Beet app and is clearly displayed.

Many blockchains have their native javascript library that can be used (e.g. [bitcoinjs](https://github.com/bitcoinjs/bitcoinjs-lib) for the Bitcoin blockchain or [bitsharesjs](https://github.com/bitshares/bitsharesjs) for the BitShares Blockchain. BeetJS can be injected into such native libraries to redirect all signature and broadcast requests to Beet, i.e. you can simply use the native javascript library and inject BeetJS when starting your application, and voila, Beet is integrated.

## For end users

Releases are bundled as installers and are available at https://github.com/bitshares/beet/releases.

    ATTENTION

Beet binaries will never be hosted anywhere but within GitHub releases. If you find Beet binaries anywhere else, it is likely a phishing attempt.

## For developers

Beet is an [electron-based app](https://www.electronjs.org) for [cross-platform compatibility](https://www.electron.build), utilising the [VueJS framework](https://blog.vuejs.org/posts/vue-3-as-the-new-default.html), [BalmUI design system](https://material.balmjs.com) and the [Socket.IO](https://socket.io) libraries.

To run Beet it's simply a case of

``` bash
# clone
git clone https://github.com/bitshares/beet
cd beet

# install dependencies
npm install

# start Beet
npm run start
```

If you are in linux you may need to do: `sudo apt-get install libudev-dev` before start Beet.

## Supported apps and web pages

 - [Bitshares NFT Viewer](https://github.com/BTS-CM/NFT_Viewer)
 - [Bitshares NFT Issuance Tool](https://github.com/BTS-CM/Bitshares_NFT_Issuance_Tool)

## Current Limitations

Beet currently only supports single-sig accounts (one private key to unlock the blockchain action), and depending on the blockchain different import options may be available.
Please open an issue to add support for your desired way.

## For businesses

You are running a business and want to facilitate the interaction of your users with a blockchain (e.g. paying subscription fees or purchases)?
Or maybe you simply have an idea for Beet?

Feel free to contact us directly and discuss opportunities. Best way is either through github, in our telegram channel https://t.me/beetapp or via carrier pigeon.

## Open milestones

 - Support other blockchains
 - Support hardware wallets
 - Additional locale translations
 - Port to mobile

## Encountered an issue? Want a new feature?

Open a [new issue](https://github.com/bitshares/beet/issues/new/choose) and fill out the template.

If you're skilled in Vue, electron or even just want to help localize the wallet, then fork the repo, create a new branch for your idea/task and submit a pull request for peer review.