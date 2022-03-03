<script setup>
    import getBlockchain from "../lib/blockchains/blockchainFactory";
    import {formatChain} from "../lib/formatter";
    import { shell } from 'electron';

    function getChainLabel(chain) {
        return formatChain(chain);
    }
    
    function getExplorer(account) {
        return getBlockchain(account.chain).getExplorer(account);
    }

    function getAccessType(chain) {
        return getBlockchain(chain).getAccessType();
    }

    function openExplorer(account) {
        shell.openExternal(this.getExplorer(account));
    }

    const account = defineProps(["account"]);
</script>

<template>
    <div class="account-details mt-3">
        <p class="mb-1 font-weight-bold small">
            {{ $t('common.account_details_lbl') }}
        </p>
        <table class="table small table-striped table-sm">
            <tbody v-if="account">
                <tr>
                    <td class="text-left">
                        {{ $t('common.account_details_chaim_lbl') }}
                    </td>
                    <td class="text-right">
                        {{ getChainLabel(account.chain) }}
                    </td>
                </tr>
                <tr>
                    <td class="text-left">
                        {{ getAccessType(account.chain) == "account" ? $t('common.account_details_name_lbl') : $t('common.account_details_address_lbl') }}
                    </td>
                    <td class="text-right">
                        {{ account.accountName }}
                    </td>
                </tr>
                <tr v-if="account.accountName != account.accountID">
                    <td class="text-left">
                        {{ $t('common.account_details_id_lbl') }}
                    </td>
                    <td class="text-right">
                        {{ account.accountID }}
                    </td>
                </tr>
                <tr v-if="getExplorer(account)">
                    <td class="text-left">
                        {{ $t('common.account_details_explorer_lbl') }}
                    </td>
                    <td class="text-right">
                        <a href="#" @click="openExplorer(account)">
                            Click here
                        </a>
                    </td>
                </tr>
            </tbody>
            <tbody v-else />
        </table>
    </div>
</template>
