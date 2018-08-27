# BitShares Companion

The BitShares Companion (temporary name) is a stand-alone key/identity-manager and signing app for BitShares, heavily influenced by Scatter (https://get-scatter.com/) and in fact sharing parts of the codebase verbatim due to the Scatter's code quality.

## Features / User Guide

On first run, you will be prompted to create a new wallet to hold your keys. You pick a name for the wallet, enter your account name, and active and memo private keys (optionally your owner key) and select a password to protect your wallet (AES encrypted).

The app will generate your public keys from those private keys and verify them against the ones stored on-chain for the account name you provided, fetching your account ID in the process.

Right now, due to BitShares Companion's 'alpha' version status, this only works with single sig accounts (1 key per authority, weight 1, threshold 1) but we plan to support the full signature schemes as per reference UI and also introduce importing of reference UI .bin format wallets.

Once your keys and account are verified, you will be redirected to the dashboard view which currently displays your account balances. This view will also be augmented with more features and data as the Companion app matures. 

The dashboard also allows you to set the preferred node used by the companion app.

While logged-in, the Companion exposes an API **LOCALLY** within your computer only that can be accessed by any web page displayed on your computer's internet browser or third party installed application, as long as it includes our client-side javascript connector (https://github.com/bitshares/beet-js).

This API allows any web-page using the connector to send requests to the companion app in order to retrieve identity (account id) or ask for an action to be taken (sign a transaction).

Of-course, any incoming request has to be **explicitly** approved by the user inside the companion app and is clearly displayed.

The app lives on your system tray and will only quit if explicitly done via right-click on the system tray icon. While minimized it will provide balloon notifications when requests are made to prompt the user to take action.

## Technology

BitShares Companion is an electron-based app for cross-platform compatibility, utilising the VueJS framework, Bootstrap CSS framework and the socket.io libraries. It shares part of its codebase with Scatter and the author is also in communication with the Scatter team to continuously improve both.

## Setup guide

For the more tech-inclined, it's simply a case of

``` bash
# clone
git clone git@github.com:clockworkgr/bitshares-companion.git
cd bitshares-companion

# install dependencies
npm install

# start the companion
npm run start
```

For the less tech-savvy, releases for OS X, Windows and Linux (Snap package) will be available soon.

## Roadmap Items

The following are in no particular order:

1. Refactor some less than ideal code parts
2. Introduce Vuex state-management and make use of vuex-bitshares(https://github.com/TrustyFund/vuex-bitshares)
3. Introduce origin verification and authorisation persistence to avoid multiple access requests by the same client app
4. Introduce more specific API methods such as transfer() instead of raw operation signing
5. Localisation
6. Multiple accounts per wallet support (as per reference UI)
7. Reference wallet importing.
8. Extra information & features on dashboard as needed
9. Port to mobile
10. Fork for graphene multi-chain support

# DISCLAIMER

The app is in **ALPHA** state, still under heavy development and may be buggy. It was written as a proof-of-concept and although there is no fear of your keys being exposed/compromised, it is not fit for production-use yet.

You are however welcome to try it out, submit bugs and use it with our showcase at www.bitsharesvotes.com
