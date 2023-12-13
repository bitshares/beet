import { formatAsset, humanReadableFloat } from "../../assetUtils";

const permission_flags = {
    charge_market_fee: 0x01 /**< an issuer-specified percentage of all market trades in this asset is paid to the issuer */,
    white_list: 0x02 /**< accounts must be whitelisted in order to hold this asset */,
    override_authority: 0x04 /**< issuer may transfer asset back to himself */,
    transfer_restricted: 0x08 /**< require the issuer to be one party to every transfer */,
    disable_force_settle: 0x10 /**< disable force settling */,
    global_settle: 0x20 /**< allow the bitasset issuer to force a global settling -- this may be set in permissions, but not flags */,
    disable_confidential: 0x40 /**< allow the asset to be used with confidential transactions */,
    witness_fed_asset: 0x80 /**< allow the asset to be fed by witnesses */,
    committee_fed_asset: 0x100 /**< allow the asset to be fed by the committee */,
    lock_max_supply: 0x200, ///< the max supply of the asset can not be updated
    disable_new_supply: 0x400, ///< unable to create new supply for the asset
    disable_mcr_update: 0x800, ///< the bitasset owner can not update MCR, permission only
    disable_icr_update: 0x1000, ///< the bitasset owner can not update ICR, permission only
    disable_mssr_update: 0x2000, ///< the bitasset owner can not update MSSR, permission only
    disable_bsrm_update: 0x4000, ///< the bitasset owner can not update BSRM, permission only
    disable_collateral_bidding: 0x8000, ///< Can not bid collateral after a global settlement
};

const uia_permission_mask = [
    "charge_market_fee",
    "white_list",
    "override_authority",
    "transfer_restricted",
    "disable_confidential",
];

/**
 *
 * @param {String} mask
 * @param {Boolean} isBitAsset
 * @returns Object
 */
function getFlagBooleans(mask, isBitAsset = false) {
    let booleans = {
        charge_market_fee: false,
        white_list: false,
        override_authority: false,
        transfer_restricted: false,
        disable_force_settle: false,
        global_settle: false,
        disable_confidential: false,
        witness_fed_asset: false,
        committee_fed_asset: false,
        lock_max_supply: false,
        disable_new_supply: false,
        disable_mcr_update: false,
        disable_icr_update: false,
        disable_mssr_update: false,
        disable_bsrm_update: false,
        disable_collateral_bidding: false,
    };

    if (mask === "all") {
        for (let flag in booleans) {
            if (!isBitAsset && uia_permission_mask.indexOf(flag) === -1) {
                delete booleans[flag];
            } else {
                booleans[flag] = true;
            }
        }
        return booleans;
    }

    for (let flag in booleans) {
        if (!isBitAsset && uia_permission_mask.indexOf(flag) === -1) {
            delete booleans[flag];
        } else {
            if (mask & permission_flags[flag]) {
                booleans[flag] = true;
            }
        }
    }

    return booleans;
}

/**
 *
 * @param {Array} accountResults
 * @param {Array} assetResults
 * @param {Object} opContents
 * @param {Array} operationArray // [0, {...}]
 * @param {Number} opType
 * @param {*} relevantOperationType
 * @returns
 */
export default async function beautify(
    accountResults, // fetched accounts
    assetResults, // fetched assets
    opContents,
    operationArray,
    opType,
    relevantOperationType
) {
    const currentOperation = {
        title: `operations.injected.BTS.${relevantOperationType.method}.title`,
        opType: opType,
        method: relevantOperationType.method,
        op: opContents,
        operation: operationArray,
    };

    if (opType == 0) {
        // transfer
        let from = accountResults.find(
            (resAcc) => resAcc.id === opContents.from
        );
        let to = accountResults.find((resAcc) => resAcc.id === opContents.to);
        let asset = assetResults.find(
            (assRes) => assRes.id === opContents.amount.asset_id
        );

        if (from && to && asset) {
            currentOperation["rows"] = [
                {
                    key: "from",
                    params: { from: from.accountName, opFrom: opContents.from },
                },
                {
                    key: "to",
                    params: { to: to.accountName, opTo: opContents.to },
                },
                {
                    key: "amount",
                    params: {
                        amount: formatAsset(
                            opContents.amount.amount,
                            asset.symbol,
                            asset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 1) {
        // limit_order_create
        let seller = accountResults.find(
            (resAcc) => resAcc.id === opContents.seller
        ).accountName;
        let buy = assetResults.find(
            (assRes) => assRes.id === opContents.min_to_receive.asset_id
        );
        let sell = assetResults.find(
            (assRes) => assRes.id === opContents.amount_to_sell.asset_id
        );

        if (seller && buy && sell) {
            let fillOrKill = opContents.amount_to_sell.fill_or_kill;

            let price =
                humanReadableFloat(
                    opContents.amount_to_sell.amount,
                    sell.precision
                ) /
                humanReadableFloat(
                    opContents.min_to_receive.amount,
                    buy.precision
                );

            currentOperation["rows"] = [
                { key: fillOrKill ? "tradeFK" : "trade" },
                {
                    key: "seller",
                    params: { seller: seller, opSeller: opContents.seller },
                },
                {
                    key: "selling",
                    params: {
                        amount: formatAsset(
                            opContents.amount_to_sell.amount,
                            sell.symbol,
                            sell.precision
                        ),
                    },
                },
                {
                    key: "buying",
                    params: {
                        amount: formatAsset(
                            opContents.min_to_receive.amount,
                            buy.symbol,
                            buy.precision
                        ),
                    },
                },
                {
                    key: "price",
                    params: {
                        price:
                            sell.precision > 0
                                ? price.toPrecision(sell.precision)
                                : parseInt(price),
                        sellSymbol: sell.symbol,
                        buySymbol: buy.symbol,
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
            ];
        }
    } else if (opType == 2) {
        // limit_order_cancel
        let feePayingAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.fee_paying_account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (feePayingAccount) {
            currentOperation["rows"] = [
                { key: "id", params: { id: opContents.order } },
                {
                    key: "fees",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
                {
                    key: "account",
                    params: {
                        account:
                            feePayingAccount ??
                            "" + " (" + opContents.fee_paying_account + ")",
                    },
                },
            ];
        }
    } else if (opType == 3) {
        // call_order_update
        let fundingAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.funding_account
        ).accountName;
        let deltaCollateral = assetResults.find(
            (assRes) => assRes.id === opContents.delta_collateral.asset_id
        );
        let deltaDebt = assetResults.find(
            (assRes) => assRes.id === opContents.delta_debt.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (fundingAccount && deltaCollateral && deltaDebt) {
            currentOperation["rows"] = [
                {
                    key: "funding_account",
                    params: {
                        funding_account:
                            fundingAccount ??
                            "" + " (" + opContents.funding_account + ")",
                    },
                },
                {
                    key: "delta_collateral",
                    params: {
                        delta_collateral: formatAsset(
                            opContents.delta_collateral.amount,
                            deltaCollateral.symbol,
                            deltaCollateral.precision
                        ),
                        id: opContents.delta_collateral.asset_id,
                    },
                },
                {
                    key: "delta_debt",
                    params: {
                        delta_debt: formatAsset(
                            opContents.delta_debt.amount,
                            deltaDebt.symbol,
                            deltaDebt.precision
                        ),
                        id: opContents.delta_debt.asset_id,
                    },
                },
                {
                    key: "fees",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
                ,
            ];
        }
    } else if (opType == 5) {
        // account_create
        let registrar = accountResults.find(
            (resAcc) => resAcc.id === opContents.registrar
        ).accountName;
        let referrer = accountResults.find(
            (resAcc) => resAcc.id === opContents.referrer
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (registrar && referrer) {
            currentOperation["rows"] = [
                {
                    key: "registrar",
                    params: {
                        registrar: registrar ?? "",
                        opRegistrar: opContents.registrar,
                    },
                },
                {
                    key: "referrer",
                    params: {
                        referrer: referrer ?? "",
                        opReferrer: opContents.referrer,
                    },
                },
                {
                    key: "referrer_percent",
                    params: { referrer_percent: opContents.referrer_percent },
                },
                { key: "name", params: { name: opContents.name } },
                { key: "ownerHeader", params: {} },
                {
                    key: "weight_threshold",
                    params: {
                        weight_threshold: opContents.owner.weight_threshold,
                    },
                },
                {
                    key: "account_auths",
                    params: {
                        account_auths: JSON.stringify(
                            opContents.owner.account_auths
                        ),
                    },
                },
                {
                    key: "key_auths",
                    params: {
                        key_auths: JSON.stringify(opContents.owner.key_auths),
                    },
                },
                {
                    key: "address_auths",
                    params: {
                        address_auths: JSON.stringify(
                            opContents.owner.address_auths
                        ),
                    },
                },
                { key: "activeHeader", params: {} },
                {
                    key: "weight_threshold",
                    params: {
                        weight_threshold: opContents.active.weight_threshold,
                    },
                },
                {
                    key: "account_auths",
                    params: {
                        account_auths: JSON.stringify(
                            opContents.active.account_auths
                        ),
                    },
                },
                {
                    key: "key_auths",
                    params: {
                        key_auths: JSON.stringify(opContents.active.key_auths),
                    },
                },
                {
                    key: "address_auths",
                    params: {
                        address_auths: JSON.stringify(
                            opContents.active.address_auths
                        ),
                    },
                },
                { key: "optionsHeader", params: {} },
                {
                    key: "memo_key",
                    params: { memo_key: opContents.options.memo_key },
                },
                {
                    key: "voting_account",
                    params: {
                        voting_account: opContents.options.voting_account,
                    },
                },
                {
                    key: "num_witness",
                    params: { num_witness: opContents.options.num_witness },
                },
                {
                    key: "num_committee",
                    params: { num_committee: opContents.options.num_committee },
                },
                {
                    key: "votes",
                    params: { votes: JSON.stringify(opContents.options.votes) },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: JSON.stringify(
                            opContents.options.extensions
                        ),
                    },
                },
                {
                    key: "fees",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
                ,
            ];
        }
    } else if (opType == 6) {
        // account_update
        let targetAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (targetAccount) {
            currentOperation["rows"] = [
                { key: "warning", params: {} },
                {
                    key: "account",
                    params: {
                        account: targetAccount ?? "",
                        opAccount: opContents.account,
                    },
                },
                {
                    key: "owner",
                    params: { owner: JSON.stringify(opContents.owner) },
                },
                {
                    key: "active",
                    params: { active: JSON.stringify(opContents.active) },
                },
                {
                    key: "new_options",
                    params: {
                        new_options: JSON.stringify(opContents.new_options),
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: JSON.stringify(opContents.extensions),
                    },
                },
                {
                    key: "fees",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
                ,
            ];
        }
    } else if (opType == 7) {
        // account_whitelist
        let authorizingAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.authorizing_account
        ).accountName;
        let accountToList = accountResults.find(
            (resAcc) => resAcc.id === opContents.account_to_list
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (authorizingAccount && accountToList) {
            currentOperation["rows"] = [
                {
                    key: "authorizing_account",
                    params: {
                        authorizingAccount: authorizingAccount ?? "",
                        authorizingAccountOP: opContents.authorizing_account,
                    },
                },
                {
                    key: "account_to_list",
                    params: {
                        accountToList: accountToList ?? "",
                        accountToListOP: opContents.account_to_list,
                    },
                },
                {
                    key: "new_listing",
                    params: { new_listing: opContents.new_listing },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 8) {
        // account_upgrade
        let accountToUpgrade = accountResults.find(
            (resAcc) => resAcc.id === opContents.account_to_upgrade
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (accountToUpgrade) {
            currentOperation["rows"] = [
                {
                    key: "account_to_upgrade",
                    params: {
                        accountToUpgrade: accountToUpgrade ?? "",
                        accountToUpgradeOP: opContents.account_to_upgrade,
                    },
                },
                {
                    key: "upgrade_to_lifetime_member",
                    params: {
                        upgradeToLifetimeMember:
                            opContents.upgrade_to_lifetime_member,
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 9) {
        // account_transfer
        let originalOwner = accountResults.find(
            (resAcc) => resAcc.id === opContents.account_id
        ).accountName;
        let newOwner = accountResults.find(
            (resAcc) => resAcc.id === opContents.new_owner
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (originalOwner && newOwner) {
            currentOperation["rows"] = [
                { key: "warning", params: {} },
                {
                    key: "account_id",
                    params: {
                        originalOwner: originalOwner ?? "",
                        account_id: opContents.account_id,
                    },
                },
                {
                    key: "new_owner",
                    params: {
                        newOwner: newOwner ?? "",
                        newOwnerOP: opContents.new_owner,
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 10 || opType == 11) {
        // Create or Update an asset
        let asset =
            opType === 11
                ? assetResults.find(
                      (assRes) => assRes.id === opContents.asset_to_update
                  ) // fetch asset to update
                : null;

        let symbol = asset ? asset.symbol : opContents.symbol;
        let precision = asset ? asset.precision : opContents.precision;
        let is_prediction_market = asset
            ? asset.is_prediction_market
            : opContents.is_prediction_market;
        let options =
            opType === 10 ? opContents.common_options : opContents.new_options;
        let max_supply = options.max_supply;
        let market_fee_percent = options.market_fee_percent;
        let max_market_fee = options.max_market_fee;
        let isBitasset = opContents.bitasset_opts ? true : false;
        let issuer_permissions = getFlagBooleans(
            options.issuer_permissions,
            isBitasset
        );
        let flags = getFlagBooleans(options.flags, isBitasset);
        let cer_base_amount = options.core_exchange_rate.base.amount;
        let cer_base_asset_id = options.core_exchange_rate.base.asset_id;
        let cer_quote_amount = options.core_exchange_rate.quote.amount;
        let cer_quote_asset_id = options.core_exchange_rate.quote.asset_id;
        let whitelist_authorities = options.whitelist_authorities;
        let blacklist_authorities = options.blacklist_authorities;
        let whitelist_markets = options.whitelist_markets;
        let blacklist_markets = options.blacklist_markets;
        let description = JSON.parse(options.description);
        let nft_object = description ? description.nft_object : null;

        let tempRows = [
            { key: "symbol", params: { symbol: symbol } },
            { key: "main", params: { main: description.main } },
            { key: "market", params: { market: description.market } },
            {
                key: "short_name",
                params: { short_name: description.short_name },
            },
            { key: "precision", params: { precision: precision } },
            { key: "max_supply", params: { max_supply: max_supply } },
            {
                key: "market_fee_percent",
                params: { market_fee_percent: market_fee_percent },
            },
            {
                key: "max_market_fee",
                params: { max_market_fee: max_market_fee },
            },
            { key: "cer", params: {} },
            {
                key: "cer_base_amount",
                params: { cer_base_amount: cer_base_amount },
            },
            { key: "cer_base_id", params: { cer_base_id: cer_base_asset_id } },
            {
                key: "cer_quote_amount",
                params: { cer_quote_amount: cer_quote_amount },
            },
            {
                key: "cer_quote_id",
                params: { cer_quote_id: cer_quote_asset_id },
            },
            {
                key: "whitelist_authorities",
                params: { whitelist_authorities: whitelist_authorities },
            },
            {
                key: "blacklist_authorities",
                params: { blacklist_authorities: blacklist_authorities },
            },
            {
                key: "whitelist_markets",
                params: { whitelist_markets: whitelist_markets },
            },
            {
                key: "blacklist_markets",
                params: { blacklist_markets: blacklist_markets },
            },
            {
                key: "is_prediction_market",
                params: { is_prediction_market: is_prediction_market },
            },
            { key: "permissions", params: {} },
            {
                key: "perm_charge_market_fee",
                params: {
                    charge_market_fee: issuer_permissions["charge_market_fee"],
                },
            },
            {
                key: "perm_white_list",
                params: { white_list: issuer_permissions["white_list"] },
            },
            {
                key: "perm_override_authority",
                params: {
                    override_authority:
                        issuer_permissions["override_authority"],
                },
            },
            {
                key: "perm_transfer_restricted",
                params: {
                    transfer_restricted:
                        issuer_permissions["transfer_restricted"],
                },
            },
            {
                key: "perm_disable_confidential",
                params: {
                    disable_confidential:
                        issuer_permissions["disable_confidential"],
                },
            },
            { key: "flags", params: {} },
            {
                key: "flag_charge_market_fee",
                params: { charge_market_fee: flags["charge_market_fee"] },
            },
            {
                key: "flag_white_list",
                params: { white_list: flags["white_list"] },
            },
            {
                key: "flag_override_authority",
                params: { override_authority: flags["override_authority"] },
            },
            {
                key: "flag_transfer_restricted",
                params: { transfer_restricted: flags["transfer_restricted"] },
            },
            {
                key: "flag_disable_confidential",
                params: { disable_confidential: flags["disable_confidential"] },
            },
            { key: "bitasset", params: {} },
        ];

        if (isBitasset) {
            tempRows = tempRows.concat([
                { key: "bitasset_opts", params: {} },
                {
                    key: "feed_lifetime_sec",
                    params: {
                        feed_lifetime_sec:
                            opContents.bitasset_opts.feed_lifetime_sec,
                    },
                },
                {
                    key: "force_settlement_delay_sec",
                    params: {
                        force_settlement_delay_sec:
                            opContents.bitasset_opts.force_settlement_delay_sec,
                    },
                },
                {
                    key: "force_settlement_offset_percent",
                    params: {
                        force_settlement_offset_percent:
                            opContents.bitasset_opts
                                .force_settlement_offset_percent,
                    },
                },
                {
                    key: "maximum_force_settlement_volume",
                    params: {
                        maximum_force_settlement_volume:
                            opContents.bitasset_opts
                                .maximum_force_settlement_volume,
                    },
                },
                {
                    key: "minimum_feeds",
                    params: {
                        minimum_feeds: opContents.bitasset_opts.minimum_feeds,
                    },
                },
                {
                    key: "short_backing_asset",
                    params: {
                        short_backing_asset:
                            opContents.bitasset_opts.short_backing_asset,
                    },
                },
            ]);
        }

        if (nft_object) {
            tempRows = tempRows.concat([
                { key: "nft", params: {} },
                {
                    key: "acknowledgements",
                    params: { acknowledgements: nft_object.acknowledgements },
                },
                {
                    key: "artist",
                    params: { artist: nft_object.artist },
                },
                {
                    key: "attestation",
                    params: { attestation: nft_object.attestation },
                },
                {
                    key: "holder_license",
                    params: { holder_license: nft_object.holder_license },
                },
                {
                    key: "license",
                    params: { license: nft_object.license },
                },
                {
                    key: "narrative",
                    params: { narrative: nft_object.narrative },
                },
                {
                    key: "title",
                    params: { title: nft_object.title },
                },
                {
                    key: "tags",
                    params: { tags: nft_object.tags },
                },
                {
                    key: "type",
                    params: { type: nft_object.type },
                },
            ]);
        }

        currentOperation["rows"] = tempRows;
    } else if (opType == 12) {
        // asset_update_bitasset
        let shortBackingAsset = assetResults.find(
            (assRes) => assRes.id === opContents.new_options.short_backing_asset
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (shortBackingAsset) {
            currentOperation["rows"] = [
                { key: "issuer", params: { issuer: opContents.issuer } },
                {
                    key: "asset_to_update",
                    params: { asset_to_update: opContents.asset_to_update },
                },
                { key: "new_options", params: {} },
                {
                    key: "feed_lifetime_sec",
                    params: {
                        feed_lifetime_sec:
                            opContents.new_options.feed_lifetime_sec,
                    },
                },
                {
                    key: "minimum_feeds",
                    params: {
                        minimum_feeds: opContents.new_options.minimum_feeds,
                    },
                },
                {
                    key: "force_settlement_delay_sec",
                    params: {
                        force_settlement_delay_sec:
                            opContents.new_options.force_settlement_delay_sec,
                    },
                },
                {
                    key: "force_settlement_offset_percent",
                    params: {
                        force_settlement_offset_percent:
                            opContents.new_options
                                .force_settlement_offset_percent,
                    },
                },
                {
                    key: "maximum_force_settlement_volume",
                    params: {
                        maximum_force_settlement_volume:
                            opContents.new_options
                                .maximum_force_settlement_volume,
                    },
                },
                {
                    key: "short_backing_asset",
                    params: { short_backing_asset: shortBackingAsset.symbol },
                },
                opContents.new_options.extensions
                    ? {
                          key: "extensions",
                          params: {
                              extensions: opContents.new_options.extensions,
                          },
                      }
                    : { key: "noExtensions", params: {} },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(opContents.fee.amount, "BTS", 5),
                        id: opContents.fee.asset_id,
                    },
                },
            ];
        }
    } else if (opType == 13) {
        // asset_update_feed_producers
        let issuer = accountResults.find(
            (resAcc) => resAcc.id === opContents.issuer
        ).accountName;
        let assetToUpdate = assetResults.find(
            (assRes) => assRes.id === opContents.new_options.short_backing_asset
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (issuer && assetToUpdate) {
            currentOperation["rows"] = [
                {
                    key: "issuer",
                    params: { issuer: issuer, issuerOP: opContents.issuer },
                },
                {
                    key: "asset_to_update",
                    params: {
                        symbol: assetToUpdate.symbol,
                        asset_to_update: opContents.asset_to_update,
                    },
                },
                {
                    key: "new_feed_producers",
                    params: {
                        new_feed_producers: JSON.stringify(
                            opContents.new_feed_producers
                        ),
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 14) {
        // asset_issue
        //let issuer = accountResults.find((resAcc) => resAcc.id === opContents.issuer).accountName;
        let targetAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.issue_to_account
        ).accountName;
        let assetToIssue = assetResults.find(
            (assRes) => assRes.id === opContents.asset_to_issue.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (targetAccount && assetToIssue) {
            currentOperation["rows"] = [
                {
                    key: "prompt",
                    params: {
                        amount: opContents.asset_to_issue.amount,
                        symbol: assetToIssue.symbol,
                        asset_id: opContents.asset_to_issue.asset_id,
                        to: targetAccount,
                        toID: opContents.issue_to_account,
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: JSON.stringify(opContents.fee).amount,
                        id: opContents.fee.asset_id,
                    },
                },
            ];
        }
    } else if (opType == 15) {
        // asset_reserve
        let payer = accountResults.find(
            (resAcc) => resAcc.id === opContents.payer
        ).accountName;
        let assetToReserve = assetResults.find(
            (assRes) => assRes.id === opContents.amount_to_reserve.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (payer && assetToReserve) {
            currentOperation["rows"] = [
                {
                    key: "payer",
                    params: { payer: payer, payerOP: opContents.payer },
                },
                {
                    key: "amount_to_reserve",
                    params: {
                        amount_to_reserve: formatAsset(
                            opContents.amount_to_reserve.amount,
                            assetToReserve.symbol,
                            assetToReserve.precision
                        ),
                        asset_id: opContents.amount_to_reserve.asset_id,
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 16) {
        // asset_fund_fee_pool
        let fromAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.from_account
        ).accountName;
        let assetToFund = assetResults.find(
            (assRes) => assRes.id === opContents.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (fromAccount && assetToFund) {
            currentOperation["rows"] = [
                {
                    key: "from_account",
                    params: {
                        from_account: fromAccount,
                        from_accountOP: opContents.from_account,
                    },
                },
                {
                    key: "asset",
                    params: {
                        from_account: assetToFund.symbol,
                        from_accountOP: opContents.asset_id,
                    },
                },
                {
                    key: "amount",
                    params: {
                        amount: formatAsset(
                            opContents.amount,
                            assetToFund.symbol,
                            assetToFund.precision
                        ),
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 17) {
        // asset_settle
        let account = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;
        let assetToSettle = assetResults.find(
            (assRes) => assRes.id === opContents.amount.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (account && assetToSettle) {
            currentOperation["rows"] = [
                {
                    key: "account",
                    params: { account: account, accountOP: opContents.account },
                },
                {
                    key: "amount",
                    params: {
                        amount: formatAsset(
                            opContents.amount.amount,
                            assetToSettle.symbol,
                            assetToSettle.precision
                        ),
                        assetID: opContents.amount.asset_id,
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 18) {
        // asset_global_settle
        let issuer = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;
        let assetToSettle = assetResults.find(
            (assRes) => assRes.id === opContents.asset_to_settle
        );
        let baseAsset = assetResults.find(
            (assRes) => assRes.id === opContents.settle_price.base.asset_id
        );
        let quoteAsset = assetResults.find(
            (assRes) => assRes.id === opContents.settle_price.quote.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (issuer && assetToSettle && baseAsset && quoteAsset) {
            let price =
                humanReadableFloat(
                    opContents.settle_price.base.amount,
                    baseAsset.precision
                ) /
                humanReadableFloat(
                    opContents.settle_price.quote.amount,
                    quoteAsset.precision
                );

            currentOperation["rows"] = [
                {
                    key: "issuer",
                    params: { issuer: issuer, issuerOP: opContents.account },
                },
                {
                    key: "asset_to_settle",
                    params: {
                        asset_to_settle: assetToSettle.symbol,
                        asset_to_settleOP: opContents.asset_to_settle,
                    },
                },
                { key: "settle_price", params: { settle_price: price } },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 19) {
        // asset_publish_feed
        let publisher = accountResults.find(
            (resAcc) => resAcc.id === opContents.publisher
        ).accountName;
        let baseAsset = assetResults.find(
            (assRes) => assRes.id === opContents.settle_price.base.asset_id
        ); // backing e.g. BTS
        let quoteAsset = assetResults.find(
            (assRes) => assRes.id === opContents.settle_price.quote.asset_id
        ); // same as asset_id

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (publisher && baseAsset && quoteAsset) {
            let coreExchangeRate =
                humanReadableFloat(
                    opContents.feed.core_exchange_rate.base.amount,
                    baseAsset.precision
                ) /
                humanReadableFloat(
                    opContents.feed.core_exchange_rate.quote.amount,
                    quoteAsset.precision
                );

            let settlementPrice =
                humanReadableFloat(
                    opContents.feed.settlement_price.base.amount,
                    baseAsset.precision
                ) /
                humanReadableFloat(
                    opContents.feed.settlement_price.quote.amount,
                    quoteAsset.precision
                );

            currentOperation["rows"] = [
                {
                    key: "publisher",
                    params: {
                        publisher: publisher,
                        publisherOP: opContents.publisher,
                    },
                },
                {
                    key: "asset_id",
                    params: {
                        symbol: quoteAsset.symbol,
                        asset_idOP: opContents.asset_id,
                    },
                },
                { key: "feed", params: {} },
                {
                    key: "core_exchange_rate",
                    params: { core_exchange_rate: coreExchangeRate },
                },
                {
                    key: "settlement_price",
                    params: { settlement_price: settlementPrice },
                },
                {
                    key: "maintenance_collateral_ratio",
                    params: {
                        maintenance_collateral_ratio:
                            opContents.feed.maintenance_collateral_ratio,
                    },
                },
                {
                    key: "maximum_short_squeeze_ratio",
                    params: {
                        maximum_short_squeeze_ratio:
                            opContents.feed.maximum_short_squeeze_ratio,
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 20) {
        // witness_create
        let witnessAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.witness_account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (witnessAccount) {
            currentOperation["rows"] = [
                {
                    key: "witness_account",
                    params: {
                        witness_account: witnessAccount,
                        witness_accountOP: opContents.witness_account,
                    },
                },
                { key: "url", params: { url: opContents.url } },
                {
                    key: "block_signing_key",
                    params: { block_signing_key: opContents.block_signing_key },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 21) {
        // witness_update
        let witnessAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.witness_account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (witnessAccount) {
            currentOperation["rows"] = [
                {
                    key: "witness",
                    params: {
                        witness: opContents.witness,
                    },
                },
                {
                    key: "witness_account",
                    params: {
                        witness_account: witnessAccount,
                        witness_accountOP: opContents.witness_account,
                    },
                },
                { key: "new_url", params: { new_url: opContents.new_url } },
                {
                    key: "new_signing_key",
                    params: { new_signing_key: opContents.new_signing_key },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 22) {
        // proposal_create
        let feePayingAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.fee_paying_account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (feePayingAccount) {
            currentOperation["rows"] = [
                {
                    key: "expiration_time",
                    params: { expiration_time: opContents.expiration_time },
                },
                {
                    key: "proposed_ops",
                    params: {
                        proposed_ops: JSON.stringify(opContents.proposed_ops),
                    },
                },
                {
                    key: "review_period_seconds",
                    params: {
                        review_period_seconds: opContents.review_period_seconds,
                    },
                },
                {
                    key: "fee_paying_account",
                    params: {
                        fee_paying_account: feePayingAccount,
                        fee_paying_accountOP: opContents.fee_paying_account,
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 23) {
        // proposal_update
        let feePayingAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.fee_paying_account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (feePayingAccount) {
            currentOperation["rows"] = [
                { key: "proposal", params: { proposal: opContents.proposal } },
                {
                    key: "active_approvals_to_add",
                    params: {
                        active_approvals_to_add: JSON.stringify(
                            opContents.active_approvals_to_add
                        ),
                    },
                },
                {
                    key: "active_approvals_to_remove",
                    params: {
                        active_approvals_to_remove: JSON.stringify(
                            opContents.active_approvals_to_remove
                        ),
                    },
                },
                {
                    key: "owner_approvals_to_add",
                    params: {
                        owner_approvals_to_add: JSON.stringify(
                            opContents.owner_approvals_to_add
                        ),
                    },
                },
                {
                    key: "owner_approvals_to_remove",
                    params: {
                        owner_approvals_to_remove: JSON.stringify(
                            opContents.owner_approvals_to_remove
                        ),
                    },
                },
                {
                    key: "key_approvals_to_add",
                    params: {
                        key_approvals_to_add: JSON.stringify(
                            opContents.key_approvals_to_add
                        ),
                    },
                },
                {
                    key: "key_approvals_to_remove",
                    params: {
                        key_approvals_to_remove: JSON.stringify(
                            opContents.key_approvals_to_remove
                        ),
                    },
                },
                {
                    key: "fee_paying_account",
                    params: {
                        fee_paying_account: feePayingAccount,
                        fee_paying_accountOP: opContents.fee_paying_account,
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 24) {
        // proposal_delete
        let feePayingAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.fee_paying_account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (feePayingAccount) {
            currentOperation["rows"] = [
                {
                    key: "using_owner_authority",
                    params: {
                        using_owner_authority: opContents.using_owner_authority,
                    },
                },
                { key: "proposal", params: { proposal: opContents.proposal } },
                {
                    key: "fee_paying_account",
                    params: {
                        fee_paying_account: feePayingAccount,
                        fee_paying_accountOP: opContents.fee_paying_account,
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 25) {
        // withdraw_permission_create
        let to = accountResults.find(
            (resAcc) => resAcc.id === opContents.authorized_account
        ).accountName;
        let from = accountResults.find(
            (resAcc) => resAcc.id === opContents.withdraw_from_account
        ).accountName;
        let asset = assetResults.find(
            (assRes) => assRes.id === opContents.withdrawal_limit.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (to && from && asset) {
            currentOperation["rows"] = [
                {
                    key: "recipient",
                    params: {
                        recipient: to,
                        recipientOP: opContents.authorized_account,
                    },
                },
                {
                    key: "withdraw_from",
                    params: {
                        withdraw_from: from,
                        withdraw_fromOP: opContents.withdraw_from_account,
                    },
                },
                {
                    key: "taking",
                    params: {
                        amount: formatAsset(
                            opContents.withdrawal_limit.amount,
                            asset.symbol,
                            asset.precision
                        ),
                        period_sec: opContents.withdrawal_period_sec,
                        period_qty: opContents.periods_until_expiration,
                    },
                },
            ];
        }
    } else if (opType == 26) {
        // withdraw_permission_update
        let withdrawFromAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.withdraw_from_account
        ).accountName;
        let authorizedAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.authorized_account
        ).accountName;
        let withdrawalLimit = assetResults.find(
            (assRes) => assRes.id === opContents.withdrawal_limit.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (withdrawFromAccount && authorizedAccount && withdrawalLimit) {
            currentOperation["rows"] = [
                {
                    key: "withdraw_from_account",
                    params: {
                        withdraw_from_account: withdrawFromAccount,
                        withdraw_from_accountOP:
                            opContents.withdraw_from_account,
                    },
                },
                {
                    key: "authorized_account",
                    params: {
                        authorized_account: authorizedAccount,
                        authorized_accountOP: opContents.authorized_account,
                    },
                },
                {
                    key: "permission_to_update",
                    params: {
                        permission_to_update: opContents.permission_to_update,
                    },
                },
                withdrawalLimit
                    ? {
                          key: "withdrawal_limited",
                          params: {
                              withdrawal_limit: formatAsset(
                                  opContents.withdrawal_limit.amount,
                                  withdrawalLimit.symbol,
                                  withdrawalLimit.precision
                              ),
                          },
                      }
                    : {
                          key: "withdrawal_unlimited",
                          params: {
                              withdrawal_limit:
                                  opContents.withdrawal_limit.amount,
                              withdrawal_limitOP:
                                  opContents.withdrawal_limit.asset_id,
                          },
                      },
                {
                    key: "withdrawal_period_sec",
                    params: {
                        withdrawal_period_sec: opContents.withdrawal_period_sec,
                    },
                },
                {
                    key: "period_start_time",
                    params: { period_start_time: opContents.period_start_time },
                },
                {
                    key: "periods_until_expiration",
                    params: {
                        periods_until_expiration:
                            opContents.periods_until_expiration,
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 27) {
        // withdraw_permission_claim
        let from = accountResults.find(
            (resAcc) => resAcc.id === opContents.withdraw_from_account
        ).accountName;
        let to = accountResults.find(
            (resAcc) => resAcc.id === opContents.withdraw_to_account
        ).accountName;
        let withdrawnAsset = assetResults.find(
            (assRes) => assRes.id === opContents.amount_to_withdraw.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (from && to && withdrawnAsset) {
            currentOperation["rows"] = [
                {
                    key: "withdraw_permission",
                    params: {
                        withdraw_permission: opContents.withdraw_permission,
                    },
                },
                {
                    key: "withdraw_from_account",
                    params: {
                        withdraw_from_account: from ?? "",
                        withdraw_from_accountOP:
                            opContents.withdraw_from_account,
                    },
                },
                {
                    key: "withdraw_to_account",
                    params: {
                        withdraw_to_account: to ?? "",
                        withdraw_to_accountOP: opContents.withdraw_to_account,
                    },
                },
                {
                    key: "amount_to_withdraw",
                    params: {
                        amount_to_withdraw: withdrawnAsset
                            ? formatAsset(
                                  opContents.amount_to_withdraw.amount,
                                  withdrawnAsset.symbol,
                                  withdrawnAsset.precision
                              )
                            : opContents.amount_to_withdraw.amount,
                        amount_to_withdrawOP:
                            opContents.amount_to_withdraw.asset_id,
                    },
                },
                { key: "memo", params: { memo: opContents.memo } },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 28) {
        // withdraw_permission_delete
        let withdrawFromAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.withdraw_from_account
        ).accountName;
        let authorizedAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.authorized_account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (withdrawFromAccount && authorizedAccount) {
            currentOperation["rows"] = [
                {
                    key: "withdraw_from_account",
                    params: {
                        withdraw_from_account: withdrawFromAccount,
                        withdraw_from_accountOP:
                            opContents.withdraw_from_account,
                    },
                },
                {
                    key: "authorized_account",
                    params: {
                        authorized_account: authorizedAccount,
                        authorized_accountOP: opContents.authorized_account,
                    },
                },
                {
                    key: "withdrawal_permission",
                    params: {
                        withdrawal_permission: opContents.withdrawal_permission,
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 29) {
        // committee_member_create
        let committeeMemberAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.committee_member_account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (committeeMemberAccount) {
            currentOperation["rows"] = [
                {
                    key: "committee_member_account",
                    params: {
                        committee_member_account: committeeMemberAccount,
                        committee_member_accountOP:
                            opContents.committee_member_account,
                    },
                },
                { key: "url", params: { url: opContents.url } },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 30) {
        // committee_member_update
        let committeeMemberAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.committee_member_account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (committeeMemberAccount) {
            currentOperation["rows"] = [
                {
                    key: "committee_member",
                    params: { committee_member: opContents.committee_member },
                },
                {
                    key: "committee_member_account",
                    params: {
                        committee_member_account: committeeMemberAccount,
                        committee_member_accountOP:
                            opContents.committee_member_account,
                    },
                },
                { key: "new_url", params: { new_url: opContents.new_url } },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 31) {
        // committee_member_update_global_parameters

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        currentOperation["rows"] = [
            { key: "new_parameters", params: {} },
            {
                key: "current_fees",
                params: {
                    current_fees: JSON.stringify(
                        opContents.new_parameters.current_fees
                    ),
                },
            },
            {
                key: "block_interval",
                params: { block_interval: opContents.block_interval },
            },
            {
                key: "maintenance_interval",
                params: {
                    maintenance_interval: opContents.maintenance_interval,
                },
            },
            {
                key: "maintenance_skip_slots",
                params: {
                    maintenance_skip_slots: opContents.maintenance_skip_slots,
                },
            },
            {
                key: "committee_proposal_review_period",
                params: {
                    committee_proposal_review_period:
                        opContents.committee_proposal_review_period,
                },
            },
            {
                key: "maximum_transaction_size",
                params: {
                    maximum_transaction_size:
                        opContents.maximum_transaction_size,
                },
            },
            {
                key: "maximum_block_size",
                params: { maximum_block_size: opContents.maximum_block_size },
            },
            {
                key: "maximum_time_until_expiration",
                params: {
                    maximum_time_until_expiration:
                        opContents.maximum_time_until_expiration,
                },
            },
            {
                key: "maximum_proposal_lifetime",
                params: {
                    maximum_proposal_lifetime:
                        opContents.maximum_proposal_lifetime,
                },
            },
            {
                key: "maximum_asset_whitelist_authorities",
                params: {
                    maximum_asset_whitelist_authorities:
                        opContents.maximum_asset_whitelist_authorities,
                },
            },
            {
                key: "maximum_asset_feed_publishers",
                params: {
                    maximum_asset_feed_publishers:
                        opContents.maximum_asset_feed_publishers,
                },
            },
            {
                key: "maximum_witness_count",
                params: {
                    maximum_witness_count: opContents.maximum_witness_count,
                },
            },
            {
                key: "maximum_committee_count",
                params: {
                    maximum_committee_count: opContents.maximum_committee_count,
                },
            },
            {
                key: "maximum_authority_membership",
                params: {
                    maximum_authority_membership:
                        opContents.maximum_authority_membership,
                },
            },
            {
                key: "reserve_percent_of_fee",
                params: {
                    reserve_percent_of_fee: opContents.reserve_percent_of_fee,
                },
            },
            {
                key: "network_percent_of_fee",
                params: {
                    network_percent_of_fee: opContents.network_percent_of_fee,
                },
            },
            {
                key: "lifetime_referrer_percent_of_fee",
                params: {
                    lifetime_referrer_percent_of_fee:
                        opContents.lifetime_referrer_percent_of_fee,
                },
            },
            {
                key: "cashback_vesting_period_seconds",
                params: {
                    cashback_vesting_period_seconds:
                        opContents.cashback_vesting_period_seconds,
                },
            },
            {
                key: "cashback_vesting_threshold",
                params: {
                    cashback_vesting_threshold:
                        opContents.cashback_vesting_threshold,
                },
            },
            {
                key: "count_non_member_votes",
                params: {
                    count_non_member_votes: opContents.count_non_member_votes,
                },
            },
            {
                key: "allow_non_member_whitelists",
                params: {
                    allow_non_member_whitelists:
                        opContents.allow_non_member_whitelists,
                },
            },
            {
                key: "witness_pay_per_block",
                params: {
                    witness_pay_per_block: opContents.witness_pay_per_block,
                },
            },
            {
                key: "worker_budget_per_day",
                params: {
                    worker_budget_per_day: opContents.worker_budget_per_day,
                },
            },
            {
                key: "max_predicate_opcode",
                params: {
                    max_predicate_opcode: opContents.max_predicate_opcode,
                },
            },
            {
                key: "fee_liquidation_threshold",
                params: {
                    fee_liquidation_threshold:
                        opContents.fee_liquidation_threshold,
                },
            },
            {
                key: "accounts_per_fee_scale",
                params: {
                    accounts_per_fee_scale: opContents.accounts_per_fee_scale,
                },
            },
            {
                key: "account_fee_scale_bitshifts",
                params: {
                    account_fee_scale_bitshifts:
                        opContents.account_fee_scale_bitshifts,
                },
            },
            {
                key: "max_authority_depth",
                params: { max_authority_depth: opContents.max_authority_depth },
            },
            {
                key: "extensions",
                params: { extensions: JSON.stringify(opContents.extensions) },
            },
            {
                key: "fee",
                params: {
                    fee: formatAsset(
                        opContents.fee.amount,
                        _feeAsset.symbol,
                        _feeAsset.precision
                    ),
                },
            },
            ,
        ];
    } else if (opType == 32) {
        // vesting_balance_create
        let creator = accountResults.find(
            (resAcc) => resAcc.id === opContents.creator
        ).accountName;
        let owner = accountResults.find(
            (resAcc) => resAcc.id === opContents.owner
        ).accountName;
        let amount = assetResults.find(
            (assRes) => assRes.id === opContents.amount.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (creator && owner && amount) {
            let tempRows = [
                {
                    key: "creator",
                    params: { creator: creator, creatorOP: opContents.creator },
                },
                {
                    key: "owner",
                    params: { owner: owner, ownerOP: opContents.owner },
                },
                {
                    key: "amount",
                    params: {
                        amount: formatAsset(
                            opContents.amount.amount,
                            amount.symbol,
                            amount.precision
                        ),
                        amount_id: opContents.amount.asset_id,
                    },
                },
                { key: "policy", params: {} },
            ];

            let policy = opContents.policy;
            if (policy[0] == 0) {
                tempRows.push({
                    key: "begin_timestamp",
                    params: { begin_timestamp: policy[1].begin_timestamp },
                });
                tempRows.push({
                    key: "vesting_cliff_seconds",
                    params: {
                        vesting_cliff_seconds: policy[1].vesting_cliff_seconds,
                    },
                });
                tempRows.push({
                    key: "vesting_duration_seconds",
                    params: {
                        vesting_duration_seconds:
                            policy[1].vesting_duration_seconds,
                    },
                });
            } else {
                tempRows.push({
                    key: "start_claim",
                    params: { start_claim: policy[1].start_claim },
                });
                tempRows.push({
                    key: "vesting_seconds",
                    params: { vesting_seconds: policy[1].vesting_seconds },
                });
            }

            tempRows.push({
                key: "fee",
                params: { fee: JSON.stringify(opContents.fee) },
            });
            return tempRows;
        }
    } else if (opType == 33) {
        // vesting_balance_withdraw
        let owner = accountResults.find(
            (resAcc) => resAcc.id === opContents.owner
        ).accountName;
        let asset = assetResults.find(
            (assRes) => assRes.id === opContents.amount.asset_id
        );

        if (owner && asset) {
            currentOperation["rows"] = [
                {
                    key: "owner",
                    params: { owner: owner, ownerOP: opContents.owner },
                },
                {
                    key: "claim",
                    params: {
                        claim: formatAsset(
                            opContents.amount.amount,
                            asset.symbol,
                            asset.precision
                        ),
                        asset_id: opContents.amount.asset_id,
                    },
                },
            ];
        }
    } else if (opType == 34) {
        // worker_create
        let owner = accountResults.find(
            (resAcc) => resAcc.id === opContents.owner
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (owner) {
            currentOperation["rows"] = [
                {
                    key: "owner",
                    params: { owner: owner, ownerOP: opContents.owner },
                },
                {
                    key: "work_begin_date",
                    params: { work_begin_date: opContents.work_begin_date },
                },
                {
                    key: "work_end_date",
                    params: { work_end_date: opContents.work_end_date },
                },
                {
                    key: "daily_pay",
                    params: { daily_pay: opContents.daily_pay },
                },
                { key: "name", params: { name: opContents.name } },
                { key: "url", params: { url: opContents.url } },
                {
                    key: "initializer",
                    params: {
                        initializer: JSON.stringify(opContents.initializer),
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 35) {
        // custom
        let payer = accountResults.find(
            (resAcc) => resAcc.id === opContents.payer
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (payer) {
            currentOperation["rows"] = [
                {
                    key: "payer",
                    params: { payer: payer, payerOP: opContents.payer },
                },
                {
                    key: "required_auths",
                    params: {
                        required_auths: JSON.stringify(
                            opContents.required_auths
                        ),
                    },
                },
                { key: "id", params: { id: opContents.id } },
                {
                    key: "data",
                    params: { data: JSON.stringify(opContents.data) },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 36) {
        // assert
        let feePayingAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.fee_paying_account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (feePayingAccount) {
            currentOperation["rows"] = [
                {
                    key: "fee_paying_account",
                    params: {
                        fee_paying_account: feePayingAccount,
                        fee_paying_accountOP: opContents.fee_paying_account,
                    },
                },
                {
                    key: "predicates",
                    params: {
                        predicates: JSON.stringify(opContents.predicates),
                    },
                },
                {
                    key: "required_auths",
                    params: {
                        required_auths: JSON.stringify(
                            opContents.required_auths
                        ),
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 37) {
        // balance_claim
        let depositToAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.deposit_to_account
        ).accountName;
        let claimedAsset = assetResults.find(
            (assRes) => assRes.id === opContents.amount.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (depositToAccount && claimedAsset) {
            currentOperation["rows"] = [
                {
                    key: "deposit_to_account",
                    params: {
                        deposit_to_account: depositToAccount,
                        deposit_to_accountOP: opContents.deposit_to_account,
                    },
                },
                {
                    key: "balance_to_claim",
                    params: { balance_to_claim: opContents.balance_to_claim },
                },
                {
                    key: "balance_owner_key",
                    params: { balance_owner_key: opContents.balance_owner_key },
                },
                {
                    key: "total_claimed",
                    params: {
                        total_claimed: formatAsset(
                            opContents.amount.amount,
                            claimedAsset.symbol,
                            claimedAsset.precision
                        ),
                        asset_id: opContents.amount.asset_id,
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 38) {
        // override_transfer
        let issuer = accountResults.find(
            (resAcc) => resAcc.id === opContents.issuer
        ).accountName;
        let from = accountResults.find(
            (resAcc) => resAcc.id === opContents.from
        ).accountName;
        let to = accountResults.find(
            (resAcc) => resAcc.id === opContents.to
        ).accountName;
        let overridenAsset = assetResults.find(
            (assRes) => assRes.id === opContents.amount.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (issuer && from && to && overridenAsset) {
            currentOperation["rows"] = [
                {
                    key: "issuer",
                    params: { issuer: issuer, issuerOP: opContents.issuer },
                },
                {
                    key: "from",
                    params: { from: from, fromOP: opContents.from },
                },
                { key: "to", params: { to: to, toOP: opContents.to } },
                {
                    key: "amount",
                    params: {
                        amount: formatAsset(
                            opContents.amount.amount,
                            overridenAsset.symbol,
                            overridenAsset.precision
                        ),
                        asset_id: opContents.amount.asset_id,
                    },
                },
                { key: "memo", params: { memo: opContents.memo } },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 39) {
        // transfer_to_blind
        let from = accountResults.find(
            (resAcc) => resAcc.id === opContents.from
        ).accountName;
        let assetToTransfer = assetResults.find(
            (assRes) => assRes.id === opContents.amount.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (from && assetToTransfer) {
            currentOperation["rows"] = [
                {
                    key: "amount",
                    params: {
                        amount: formatAsset(
                            opContents.amount.amount,
                            assetToTransfer.symbol,
                            assetToTransfer.precision
                        ),
                    },
                },
                {
                    key: "from",
                    params: { from: from, fromOP: opContents.from },
                },
                {
                    key: "blinding_factor",
                    params: { blinding_factor: opContents.blinding_factor },
                },
                {
                    key: "outputs",
                    params: { outputs: JSON.stringify(opContents.outputs) },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 40) {
        // blind_transfer
        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        currentOperation["rows"] = [
            {
                key: "inputs",
                params: { inputs: JSON.stringify(opContents.inputs) },
            },
            {
                key: "outputs",
                params: { outputs: JSON.stringify(opContents.outputs) },
            },
            {
                key: "fee",
                params: {
                    fee: formatAsset(
                        opContents.fee.amount,
                        _feeAsset.symbol,
                        _feeAsset.precision
                    ),
                },
            },
            ,
        ];
    } else if (opType == 41) {
        // transfer_from_blind
        let to = accountResults.find(
            (resAcc) => resAcc.id === opContents.to
        ).accountName;
        let assetToTransfer = assetResults.find(
            (assRes) => assRes.id === opContents.amount.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (to && assetToTransfer) {
            currentOperation["rows"] = [
                {
                    key: "amount",
                    params: {
                        amount: formatAsset(
                            opContents.amount.amount,
                            assetToTransfer.symbol,
                            assetToTransfer.precision
                        ),
                    },
                },
                { key: "to", params: { to: to, toOP: opContents.to } },
                {
                    key: "blinding_factor",
                    params: { blinding_factor: opContents.blinding_factor },
                },
                {
                    key: "inputs",
                    params: { inputs: JSON.stringify(opContents.inputs) },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 43) {
        // asset_claim_fees
        let issuer = accountResults.find(
            (resAcc) => resAcc.id === opContents.issuer
        ).accountName;
        let assetToClaim = assetResults.find(
            (assRes) => assRes.id === opContents.amount_to_claim.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (issuer && assetToClaim) {
            currentOperation["rows"] = [
                {
                    key: "issuer",
                    params: { issuer: issuer, issuerOP: opContents.issuer },
                },
                {
                    key: "amount_to_claim",
                    params: {
                        amount_to_claim: formatAsset(
                            opContents.amount_to_claim.amount,
                            assetToClaim.symbol,
                            assetToClaim.precision
                        ),
                        asset_id: opContents.amount_to_claim.asset_id,
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: JSON.stringify(opContents.extensions),
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 45) {
        // bid_collateral
        let bidder = accountResults.find(
            (resAcc) => resAcc.id === opContents.bidder
        ).accountName;
        let collateral = assetResults.find(
            (assRes) => assRes.id === opContents.additional_collateral.asset_id
        );
        let debtCovered = assetResults.find(
            (assRes) => assRes.id === opContents.debtCovered.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (bidder && collateral && debtCovered) {
            currentOperation["rows"] = [
                {
                    key: "bidder",
                    params: { bidder: bidder, bidderOP: opContents.bidder },
                },
                {
                    key: "additional_collateral",
                    params: {
                        additional_collateral: formatAsset(
                            opContents.additional_collateral.amount,
                            collateral.symbol,
                            collateral.precision
                        ),
                    },
                },
                {
                    key: "debt_covered",
                    params: {
                        debt_covered: formatAsset(
                            opContents.debt_covered.amount,
                            debtCovered.symbol,
                            debtCovered.precision
                        ),
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 47) {
        // asset_claim_pool
        let issuer = accountResults.find(
            (resAcc) => resAcc.id === opContents.issuer
        ).accountName;
        let relevantAsset = assetResults.find(
            (assRes) => assRes.id === opContents.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (issuer && relevantAsset) {
            currentOperation["rows"] = [
                {
                    key: "issuer",
                    params: { issuer: issuer, issuerOP: opContents.issuer },
                },
                { key: "asset_id", params: { asset_id: opContents.asset_id } },
                {
                    key: "amount_to_claim",
                    params: {
                        amount_to_claim: formatAsset(
                            opContents.amount_to_claim.amount,
                            relevantAsset.symbol,
                            relevantAsset.precision
                        ),
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 48) {
        // asset_update_issuer
        let issuer = accountResults.find(
            (resAcc) => resAcc.id === opContents.issuer
        ).accountName;
        let new_issuer = accountResults.find(
            (resAcc) => resAcc.id === opContents.new_issuer
        ).accountName;
        let assetToUpdate = assetResults.find(
            (assRes) => assRes.id === opContents.asset_to_update
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (issuer && new_issuer && assetToUpdate) {
            currentOperation["rows"] = [
                {
                    key: "issuer",
                    params: { issuer: issuer, issuerOP: opContents.issuer },
                },
                {
                    key: "asset_to_update",
                    params: { asset_to_update: assetToUpdate.symbol },
                },
                {
                    key: "new_issuer",
                    params: {
                        new_issuer: new_issuer,
                        new_issuerOP: opContents.new_issuer,
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 49) {
        // htlc_create
        let from = accountResults.find(
            (resAcc) => resAcc.id === opContents.from
        ).accountName;
        let to = accountResults.find(
            (resAcc) => resAcc.id === opContents.to
        ).accountName;
        let htlcAsset = assetResults.find(
            (assRes) => assRes.id === opContents.amount.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (from && to && htlcAsset) {
            currentOperation["rows"] = [
                {
                    key: "from",
                    params: { from: from, fromOP: opContents.from },
                },
                { key: "to", params: { to: to, toOP: opContents.to } },
                {
                    key: "amount",
                    params: {
                        amount: formatAsset(
                            opContents.amount.amount,
                            htlcAsset.symbol,
                            htlcAsset.precision
                        ),
                    },
                },
                {
                    key: "preimage_hash",
                    params: { preimage_hash: opContents.preimage_hash },
                },
                {
                    key: "preimage_size",
                    params: { preimage_size: opContents.preimage_size },
                },
                {
                    key: "claim_period_seconds",
                    params: {
                        claim_period_seconds: opContents.claim_period_seconds,
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 50) {
        // htlc_redeem
        let redeemer = accountResults.find(
            (resAcc) => resAcc.id === opContents.redeemer
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (redeemer) {
            currentOperation["rows"] = [
                { key: "htlc_id", params: { htlc_id: opContents.htlc_id } },
                {
                    key: "redeemer",
                    params: {
                        redeemer: redeemer,
                        redeemerOP: opContents.redeemer,
                    },
                },
                { key: "preimage", params: { preimage: opContents.preimage } },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 52) {
        // htlc_extend
        let update_issuer = accountResults.find(
            (resAcc) => resAcc.id === opContents.update_issuer
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (update_issuer) {
            currentOperation["rows"] = [
                { key: "htlc_id", params: { htlc_id: opContents.htlc_id } },
                {
                    key: "update_issuer",
                    params: {
                        update_issuer: update_issuer,
                        update_issuerOP: opContents.update_issuer,
                    },
                },
                {
                    key: "seconds_to_add",
                    params: { seconds_to_add: opContents.seconds_to_add },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 54) {
        // custom_authority_create
        let account = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (account) {
            currentOperation["rows"] = [
                {
                    key: "account",
                    params: { account: account, accountOP: opContents.account },
                },
                { key: "enabled", params: { enabled: opContents.enabled } },
                {
                    key: "valid_from",
                    params: { valid_from: opContents.valid_from },
                },
                { key: "valid_to", params: { valid_to: opContents.valid_to } },
                {
                    key: "operation_type",
                    params: { operation_type: opContents.operation_type },
                },
                {
                    key: "auth",
                    params: { auth: JSON.stringify(opContents.auth) },
                },
                {
                    key: "restrictions",
                    params: {
                        restrictions: JSON.stringify(opContents.restrictions),
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 55) {
        // custom_authority_update
        let account = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (account) {
            currentOperation["rows"] = [
                {
                    key: "account",
                    params: { account: account, accountOP: opContents.account },
                },
                {
                    key: "authority_to_update",
                    params: {
                        authority_to_update: opContents.authority_to_update,
                    },
                },
                {
                    key: "new_enabled",
                    params: { new_enabled: opContents.new_enabled },
                },
                {
                    key: "new_valid_from",
                    params: { new_valid_from: opContents.new_valid_from },
                },
                {
                    key: "new_valid_to",
                    params: { new_valid_to: opContents.new_valid_to },
                },
                {
                    key: "new_auth",
                    params: { new_auth: JSON.stringify(opContents.new_auth) },
                },
                {
                    key: "restrictions_to_remove",
                    params: {
                        restrictions_to_remove: JSON.stringify(
                            opContents.restrictions_to_remove
                        ),
                    },
                },
                {
                    key: "restrictions_to_add",
                    params: {
                        restrictions_to_add: JSON.stringify(
                            opContents.restrictions_to_add
                        ),
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 56) {
        // custom_authority_delete
        let account = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (account) {
            currentOperation["rows"] = [
                {
                    key: "account",
                    params: { account: account, accountOP: opContents.account },
                },
                {
                    key: "authority_to_delete",
                    params: {
                        authority_to_delete: opContents.authority_to_delete,
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 57) {
        // ticket_create
        let account = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;
        let ticketAsset = assetResults.find(
            (assRes) => assRes.id === opContents.amount.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (account && ticketAsset) {
            currentOperation["rows"] = [
                {
                    key: "account",
                    params: { account: account, accountOP: opContents.account },
                },
                {
                    key: "target_type",
                    params: { target_type: opContents.target_type },
                },
                {
                    key: "amount",
                    params: {
                        amount: formatAsset(
                            opContents.amount.amount,
                            ticketAsset.symbol,
                            ticketAsset.precision
                        ),
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 58) {
        // ticket_update
        let account = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;
        let ticketAsset = assetResults.find(
            (assRes) => assRes.id === opContents.amount_for_new_target.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (account && ticketAsset) {
            currentOperation["rows"] = [
                { key: "ticket", params: { ticket: opContents.ticket } },
                {
                    key: "account",
                    params: { account: account, accountOP: opContents.account },
                },
                {
                    key: "target_type",
                    params: { target_type: opContents.target_type },
                },
                {
                    key: "amount_for_new_target",
                    params: {
                        amount_for_new_target: formatAsset(
                            opContents.amount_for_new_target.amount,
                            ticketAsset.symbol,
                            ticketAsset.precision
                        ),
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
            ];
        }
    } else if (opType == 59) {
        // liquidity_pool_create
        let account = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;
        let assetA = assetResults.find(
            (assRes) => assRes.id === opContents.asset_a
        );
        let assetB = assetResults.find(
            (assRes) => assRes.id === opContents.asset_b
        );
        let shareAsset = assetResults.find(
            (assRes) => assRes.id === opContents.share_asset
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (account && assetA && assetB && shareAsset) {
            currentOperation["rows"] = [
                {
                    key: "account",
                    params: { account: account, accountOP: opContents.account },
                },
                {
                    key: "asset_a",
                    params: {
                        asset_a: assetA.symbol,
                        asset_aOP: opContents.asset_a,
                    },
                },
                {
                    key: "asset_b",
                    params: {
                        asset_b: assetB.symbol,
                        asset_bOP: opContents.asset_b,
                    },
                },
                {
                    key: "share_asset",
                    params: {
                        share_asset: shareAsset.symbol,
                        share_assetOP: opContents.share_asset,
                    },
                },
                {
                    key: "taker_fee_percent",
                    params: { taker_fee_percent: opContents.taker_fee_percent },
                },
                {
                    key: "withdrawal_fee_percent",
                    params: {
                        withdrawal_fee_percent:
                            opContents.withdrawal_fee_percent,
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 60) {
        // liquidity_pool_delete
        let account = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (account) {
            currentOperation["rows"] = [
                {
                    key: "account",
                    params: { account: account, accountOP: opContents.account },
                },
                { key: "pool_id", params: { pool_id: opContents.pool } },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 61) {
        // liquidity_pool_deposit
        let account = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;
        let amountA = assetResults.find(
            (assRes) => assRes.id === opContents.amount_a.asset_id
        );
        let amountB = assetResults.find(
            (assRes) => assRes.id === opContents.amount_b.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (account && amountA && amountB) {
            currentOperation["rows"] = [
                {
                    key: "account",
                    params: { account: account, accountOP: opContents.account },
                },
                { key: "pool", params: { pool: opContents.pool } },
                {
                    key: "amount_a",
                    params: {
                        amount_a: formatAsset(
                            opContents.amount_a.amount,
                            amountA.symbol,
                            amountA.precision
                        ),
                        amount_aOP: opContents.amount_a.asset_id,
                    },
                },
                {
                    key: "amount_b",
                    params: {
                        amount_b: formatAsset(
                            opContents.amount_b.amount,
                            amountB.symbol,
                            amountB.precision
                        ),
                        amount_bOP: opContents.amount_b.asset_id,
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 62) {
        // liquidity_pool_withdraw
        let account = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;
        let shareAsset = assetResults.find(
            (assRes) => assRes.id === opContents.share_amount.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (account && shareAsset) {
            currentOperation["rows"] = [
                {
                    key: "account",
                    params: { account: account, accountOP: opContents.account },
                },
                { key: "pool", params: { pool: opContents.pool } },
                {
                    key: "share_amount",
                    params: {
                        share_amount: formatAsset(
                            opContents.share_amount.amount,
                            shareAsset.symbol,
                            shareAsset.precision
                        ),
                        share_amountOP: opContents.share_amount.asset_id,
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 63) {
        // liquidity_pool_exchange
        let account = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;
        let soldAsset = assetResults.find(
            (assRes) => assRes.id === opContents.amount_to_sell.asset_id
        );
        let receivedAsset = assetResults.find(
            (assRes) => assRes.id === opContents.min_to_receive.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (account && soldAsset && receivedAsset) {
            currentOperation["rows"] = [
                {
                    key: "account",
                    params: { account: account, accountOP: opContents.account },
                },
                { key: "pool", params: { pool: opContents.pool } },
                {
                    key: "amount_to_sell",
                    params: {
                        amount_to_sell: formatAsset(
                            opContents.amount_to_sell.amount,
                            soldAsset.symbol,
                            soldAsset.precision
                        ),
                    },
                },
                {
                    key: "min_to_receive",
                    params: {
                        min_to_receive: formatAsset(
                            opContents.min_to_receive.amount,
                            receivedAsset.symbol,
                            receivedAsset.precision
                        ),
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 64) {
        // samet_fund_create
        let ownerAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.owner_account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (ownerAccount) {
            currentOperation["rows"] = [
                {
                    key: "owner_account",
                    params: {
                        owner_account: ownerAccount,
                        owner_accountOP: opContents.owner_account,
                    },
                },
                {
                    key: "asset_type",
                    params: { asset_type: opContents.asset_type },
                },
                { key: "balance", params: { balance: opContents.balance } },
                { key: "fee_rate", params: { fee_rate: opContents.fee_rate } },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 65) {
        // samet_fund_delete
        let ownerAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.owner_account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (ownerAccount) {
            currentOperation["rows"] = [
                {
                    key: "owner_account",
                    params: {
                        owner_account: ownerAccount,
                        owner_accountOP: opContents.owner_account,
                    },
                },
                { key: "fund_id", params: { fund_id: opContents.fund_id } },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 66) {
        // samet_fund_update
        let ownerAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.owner_account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        let deltaAmount = opContents.delta_amount
            ? assetResults.find(
                  (assRes) => assRes.id === opContents.delta_amount.asset_id
              )
            : null;
        if (ownerAccount) {
            currentOperation["rows"] = [
                {
                    key: "owner_account",
                    params: {
                        owner_account: ownerAccount,
                        owner_accountOP: opContents.owner_account,
                    },
                },
                { key: "fund_id", params: { fund_id: opContents.fund_id } },
                {
                    key: "delta_amount",
                    params: {
                        delta_amount: deltaAmount
                            ? formatAsset(
                                  opContents.delta_amount.amount,
                                  deltaAmount.symbol,
                                  deltaAmount.precision
                              )
                            : "{}",
                    },
                },
                {
                    key: "new_fee_rate",
                    params: { new_fee_rate: opContents.new_fee_rate },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 67) {
        // samet_fund_borrow
        let borrower = accountResults.find(
            (resAcc) => resAcc.id === opContents.borrower
        ).accountName;
        let borrowAmount = assetResults.find(
            (assRes) => assRes.id === opContents.borrow_amount.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (borrower && borrowAmount) {
            currentOperation["rows"] = [
                {
                    key: "borrower",
                    params: {
                        borrower: borrower,
                        borrowerOP: opContents.borrower,
                    },
                },
                { key: "fund_id", params: { fund_id: opContents.fund_id } },
                {
                    key: "borrow_amount",
                    params: {
                        borrow_amount: formatAsset(
                            opContents.borrow_amount.amount,
                            borrowAmount.symbol,
                            borrowAmount.precision
                        ),
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 68) {
        // samet_fund_repay
        let account = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;
        let repayAmount = assetResults.find(
            (assRes) => assRes.id === opContents.repay_amount.asset_id
        );
        let fundFee = assetResults.find(
            (assRes) => assRes.id === opContents.fund_fee.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (account && repayAmount && fundFee) {
            currentOperation["rows"] = [
                {
                    key: "account",
                    params: { account: account, accountOP: opContents.account },
                },
                { key: "fund_id", params: { fund_id: opContents.fund_id } },
                {
                    key: "repay_amount",
                    params: {
                        repay_amount: formatAsset(
                            opContents.repay_amount.amount,
                            repayAmount.symbol,
                            repayAmount.precision
                        ),
                    },
                },
                {
                    key: "fund_fee",
                    params: {
                        fund_fee: formatAsset(
                            opContents.fund_fee.amount,
                            fundFee.symbol,
                            fundFee.precision
                        ),
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 69) {
        // credit_offer_create
        let ownerAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.owner_account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (ownerAccount) {
            currentOperation["rows"] = [
                {
                    key: "owner_account",
                    params: {
                        owner_account: ownerAccount,
                        owner_accountOP: opContents.owner_account,
                    },
                },
                {
                    key: "asset_type",
                    params: { asset_type: opContents.asset_type },
                },
                { key: "balance", params: { balance: opContents.balance } },
                { key: "fee_rate", params: { fee_rate: opContents.fee_rate } },
                {
                    key: "max_duration_seconds",
                    params: {
                        max_duration_seconds: opContents.max_duration_seconds,
                    },
                },
                {
                    key: "min_deal_amount",
                    params: { min_deal_amount: opContents.min_deal_amount },
                },
                { key: "enabled", params: { enabled: opContents.enabled } },
                {
                    key: "auto_disable_time",
                    params: { auto_disable_time: opContents.auto_disable_time },
                },
                {
                    key: "acceptable_collateral",
                    params: {
                        acceptable_collateral: JSON.stringify(
                            opContents.acceptable_collateral
                        ),
                    },
                },
                {
                    key: "acceptable_borrowers",
                    params: {
                        acceptable_borrowers: JSON.stringify(
                            opContents.acceptable_borrowers
                        ),
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 70) {
        // credit_offer_delete
        let ownerAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.owner_account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        if (ownerAccount) {
            currentOperation["rows"] = [
                {
                    key: "owner_account",
                    params: {
                        owner_account: ownerAccount,
                        owner_accountOP: opContents.owner_account,
                    },
                },
                { key: "offer_id", params: { offer_id: opContents.offer_id } },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 71) {
        // credit_offer_update
        let ownerAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.owner_account
        ).accountName;

        let deltaAmount = opContents.delta_amount
            ? assetResults.find(
                  (assRes) => assRes.id === opContents.delta_amount.asset_id
              )
            : null;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (ownerAccount && deltaAmount) {
            currentOperation["rows"] = [
                {
                    key: "owner_account",
                    params: {
                        owner_account: ownerAccount,
                        owner_accountOP: opContents.owner_account,
                    },
                },
                { key: "offer_id", params: { offer_id: opContents.offer_id } },
                {
                    key: "delta_amount",
                    params: {
                        delta_amount: formatAsset(
                            opContents.delta_amount.amount,
                            deltaAmount.symbol,
                            deltaAmount.precision
                        ),
                    },
                },
                { key: "fee_rate", params: { fee_rate: opContents.fee_rate } },
                {
                    key: "max_duration_seconds",
                    params: {
                        max_duration_seconds: opContents.max_duration_seconds,
                    },
                },
                {
                    key: "min_deal_amount",
                    params: { min_deal_amount: opContents.min_deal_amount },
                },
                { key: "enabled", params: { enabled: opContents.enabled } },
                {
                    key: "auto_disable_time",
                    params: { auto_disable_time: opContents.auto_disable_time },
                },
                {
                    key: "acceptable_collateral",
                    params: {
                        acceptable_collateral: JSON.stringify(
                            opContents.acceptable_collateral
                        ),
                    },
                },
                {
                    key: "acceptable_borrowers",
                    params: {
                        acceptable_borrowers: JSON.stringify(
                            opContents.acceptable_borrowers
                        ),
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 72) {
        // credit_offer_accept
        let borrower = accountResults.find(
            (resAcc) => resAcc.id === opContents.borrower
        ).accountName;
        let borrowAmount = assetResults.find(
            (assRes) => assRes.id === opContents.borrow_amount.asset_id
        );
        let collateral = assetResults.find(
            (assRes) => assRes.id === opContents.collateral.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (borrower && borrowAmount && collateral) {
            currentOperation["rows"] = [
                {
                    key: "borrower",
                    params: {
                        borrower: borrower,
                        borrowerOP: opContents.borrower,
                    },
                },
                { key: "offer_id", params: { offer_id: opContents.offer_id } },
                {
                    key: "borrow_amount",
                    params: {
                        borrow_amount: formatAsset(
                            opContents.borrow_amount.amount,
                            borrowAmount.symbol,
                            borrowAmount.precision
                        ),
                    },
                },
                {
                    key: "collateral",
                    params: {
                        collateral: formatAsset(
                            opContents.collateral.amount,
                            collateral.symbol,
                            collateral.precision
                        ),
                    },
                },
                {
                    key: "max_fee_rate",
                    params: { max_fee_rate: opContents.max_fee_rate },
                },
                {
                    key: "min_duration_seconds",
                    params: {
                        min_duration_seconds: opContents.min_duration_seconds,
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 73) {
        // credit_deal_repay
        let account = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;
        let repayAmount = assetResults.find(
            (assRes) => assRes.id === opContents.repay_amount.asset_id
        );
        let creditFee = assetResults.find(
            (assRes) => assRes.id === opContents.credit_fee.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        if (account && repayAmount && creditFee) {
            currentOperation["rows"] = [
                {
                    key: "account",
                    params: { account: account, accountOP: opContents.account },
                },
                { key: "deal_id", params: { deal_id: opContents.deal_id } },
                {
                    key: "repay_amount",
                    params: {
                        repay_amount: formatAsset(
                            opContents.repay_amount.amount,
                            repayAmount.symbol,
                            repayAmount.precision
                        ),
                    },
                },
                {
                    key: "credit_fee",
                    params: {
                        credit_fee: formatAsset(
                            opContents.credit_fee.amount,
                            creditFee.symbol,
                            creditFee.precision
                        ),
                    },
                },
                {
                    key: "extensions",
                    params: {
                        extensions: opContents.extensions
                            ? JSON.stringify(opContents.extensions)
                            : "[]",
                    },
                },
                {
                    key: "fee",
                    params: {
                        fee: formatAsset(
                            opContents.fee.amount,
                            _feeAsset.symbol,
                            _feeAsset.precision
                        ),
                    },
                },
            ];
        }
    } else if (opType == 75) {
        // liquidity_pool_update_operation
        let _ownerAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        currentOperation["rows"] = [
            {
                key: "account",
                params: {
                    owner_account: _ownerAccount,
                    owner_accountOP: opContents.account,
                },
            },
            { key: "pool", params: { pool_id: opContents.pool } },
            {
                key: "taker_fee_percent",
                params: { taker_fee_percent: opContents.taker_fee_percent },
            },
            {
                key: "withdrawal_fee_percent",
                params: {
                    withdrawal_fee_percent: opContents.withdrawal_fee_percent,
                },
            },
            {
                key: "extensions",
                params: { extensions: JSON.stringify(opContents.extensions) },
            },
            {
                key: "fee",
                params: {
                    fee: formatAsset(
                        opContents.fee.amount,
                        _feeAsset.symbol,
                        _feeAsset.precision
                    ),
                },
            },
        ];
    } else if (opType == 76) {
        // credit_deal_update_operation
        let _borrowerAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.account
        ).accountName;

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );
        currentOperation["rows"] = [
            {
                key: "fee",
                params: {
                    fee: formatAsset(
                        opContents.fee.amount,
                        _feeAsset.symbol,
                        _feeAsset.precision
                    ),
                },
            },
            {
                key: "account",
                params: {
                    account: _borrowerAccount,
                    accountOP: opContents.account,
                },
            },
            { key: "deal_id", params: { deal_id: opContents.deal_id } },
            {
                key: "auto_repay",
                params: { auto_repay: opContents.auto_repay },
            },
        ];
    } else if (opType == 77) {
        // limit_order_update_operation
        let _sellerAccount = accountResults.find(
            (resAcc) => resAcc.id === opContents.seller
        ).accountName;

        let _assetToSell = assetResults.find(
            (assRes) => assRes.id === opContents.delta_amount_to_sell.asset_id
        );

        let _feeAsset = assetResults.find(
            (assRes) => assRes.id === opContents.fee.asset_id
        );

        const rowContents = [
            {
                key: "fee",
                params: {
                    fee: formatAsset(
                        opContents.fee.amount,
                        _feeAsset.symbol,
                        _feeAsset.precision
                    ),
                },
            },
            {
                key: "seller",
                params: {
                    seller: _sellerAccount,
                    sellerOP: opContents.seller,
                },
            },
            { key: "order", params: { order: opContents.order } },
        ];

        if (opContents.new_price) {
            rowContents.push({
                key: "new_price",
                params: { new_price: opContents.new_price },
            });
        }

        if (opContents.delta_amount_to_sell) {
            rowContents.push({
                key: "delta_amount_to_sell",
                params: {
                    delta_amount_to_sell: formatAsset(
                        opContents.delta_amount_to_sell.amount,
                        _assetToSell.symbol,
                        _assetToSell.precision
                    ),
                },
            });
        }

        if (opContents.new_expiration) {
            rowContents.push({
                key: "new_expiration",
                params: { new_expiration: opContents.new_expiration },
            });
        }

        if (opContents.on_fill) {
            rowContents.push({
                key: "on_fill",
                params: { on_fill: JSON.stringify(opContents.on_fill) },
            });
        }

        if (opContents.extensions) {
            rowContents.push({
                key: "extensions",
                params: {
                    extensions: JSON.stringify(opContents.extensions),
                },
            });
        }

        currentOperation["rows"] = rowContents;
    }

    return currentOperation; // No matching operation
}
