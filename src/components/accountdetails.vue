<template>
    <div class="account-details mt-3">
        <p class="mb-1 font-weight-bold small">
            {{ $t('account_details_lbl') }}
        </p>
        <table class="table small table-striped table-sm">
            <tbody v-if="account">
                <tr>
                    <td class="text-left">
                        {{ $t('account_details_chaim_lbl') }}
                    </td>
                    <td class="text-right">
                        {{ getChainLabel(account.chain) }}
                    </td>
                </tr>
                <tr>
                    <td class="text-left">
                        {{ getAccessType(account.chain) == "account" ? $t('account_details_name_lbl') : $t('account_details_address_lbl') }}
                    </td>
                    <td class="text-right">
                        {{ account.accountName }}
                    </td>
                </tr>
                <tr v-if="account.accountName != account.accountID">
                    <td class="text-left">
                        {{ $t('account_details_id_lbl') }}
                    </td>
                    <td class="text-right">
                        {{ account.accountID }}
                    </td>
                </tr>
                <tr>
                    <td class="text-left">
                        {{ $t('account_details_explorer_lbl') }}
                    </td>
                    <td class="text-right">
                        <a
                            href="#"
                            @click="openExplorer(account)"
                        >
                            Click here
                        </a>
                    </td>
                </tr>
            </tbody>
            <tbody v-else />
        </table>
    </div>
</template>
<script>
    import getBlockchain from "../lib/blockchains/blockchainFactory";
    import {formatChain} from "../lib/formatter";    
    import { shell } from 'electron';

    export default {
        name: "AccountDetails",
        i18nOptions: { namespaces: "common" },
        props: ["account"],
        methods: {
            getChainLabel: function(chain) {
                return formatChain(chain);
            },
            getExplorer: function(account) {
                return getBlockchain(account.chain).getExplorer(account);
            },
            getAccessType: function(chain) {
                return getBlockchain(chain).getAccessType();
            },
            openExplorer: function(account) {
                shell.openExternal(this.getExplorer({accountName: account}));
            }
        }
    };
</script>
