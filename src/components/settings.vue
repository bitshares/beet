<template>
    <div class="bottom p-0">
        <div class="content">
            <div class="settings mt-3">
                <p class="mb-1 font-weight-bold">
                    {{ $t('settings_lbl') }}
                </p>
            </div>
            <div class="dapp-list mt-2">
                <p class="mb-2 font-weight-bold small">
                    <u>{{ $t('dapps_lbl') }}</u>
                </p>
                <table class="table small table-striped table-sm">
                    <thead>
                        <tr>
                            <th
                                class="align-middle"
                            >
                                {{ $t('appname_lbl') }}
                            </th>
                            <th
                                class="align-middle"
                            >
                                {{ $t('origin_lbl') }}
                            </th>
                            <th
                                class="align-middle"
                            >
                                {{ $t('account_lbl') }}
                            </th>
                            <th
                                class="align-middle"
                            >
                                {{ $t('chain_lbl') }}
                            </th>
                            <th
                                class="align-middle"
                            >
                                {{ $t('actions_lbl') }}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="dapps.length==0">
                            <td
                                colspan="6"
                                class="align-center"
                            >
                                <em>{{ $t('no_dapps_linked') }}</em>
                            </td>
                        </tr>
                        <tr
                            v-for="dapp in dapps"
                            :key="dapp.id"
                        >
                            <td
                                class="align-middle"
                            >
                                {{ dapp.appName }}
                            </td>
                            <td
                                class="align-middle"
                            >
                                {{ dapp.origin }}
                            </td>
                            <td
                                class="align-middle"
                                v-html="getDisplayString(dapp.account_id, dapp.chain)"
                            >
                            </td>
                            <td
                                class="align-middle"
                            >
                                {{ dapp.chain }}
                            </td>
                            <td
                                class="align-middle"
                            >
                                <button
                                    class="btn btn-sm btn-danger btn-block"
                                    type="button"
                                    @click="deleteDapp(dapp.id)"
                                >
                                    {{ $t('delete_btn') }}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="backup mt-2 mb-4">
                <p class="mb-2 font-weight-bold small">
                    <u>{{ $t('backup_lbl') }}</u>
                </p>
                <div class="row px-4">
                    <div class="col-12">
                        <p class="small text-justify">
                            {{ $t('backup_txt') }}
                        </p>
                    </div>
                    <div class="col-3" />
                    <div class="col-6">
                        <button
                            class="btn btn-sm btn-info btn-block"
                            type="button"
                            @click="downloadBackup"
                        >
                            {{ $t('backup_btn') }}
                        </button>
                    </div>
                    <div class="col-3" />
                </div>
            </div>
        </div>
        <Actionbar />
    </div>
</template>

<script>
    import { EventBus } from "../lib/event-bus.js";
    import Actionbar from "./actionbar";
    import { ipcRenderer } from "electron";
    import RendererLogger from "../lib/RendererLogger";
    import {formatAccount} from "../lib/formatter";

    const logger = new RendererLogger();

    export default {
        name: "Settings",
        i18nOptions: { namespaces: ["common"] },
        components: {Actionbar},
        data() {
            return {

            };
        },
        computed: {
            dapps() {
                let dapps=[];
                for (let i=0;i< this.$store.state.AccountStore.accountlist.length;i++) {
                    let apps=this.$store.getters['OriginStore/walletAccessibleDapps'](this.$store.state.AccountStore.accountlist[i].accountID,this.$store.state.AccountStore.accountlist[i].chain);
                    if (typeof apps!='undefined') {
                        dapps=dapps.concat(apps);
                    }
                }
                return dapps;
            }
        },
        watch: {},
        created() {},
        async mounted() {
            logger.debug("Settings Mounted");
            await this.$store.dispatch("OriginStore/loadApps");
        },
        methods: {
            downloadBackup: async function () {
                EventBus.$emit("popup", "load-start");
                ipcRenderer.send(
                  "downloadBackup",
                  {
                    eventbus: EventBus,
                    walletName: this.$store.state.WalletStore.wallet.name,
                    accounts: this.$store.state.AccountStore.accountlist.slice()
                  }
                );
            },
            deleteDapp: async function(dapp_id) {
                await this.$store.dispatch('OriginStore/removeApp', dapp_id);
            },
            getDisplayString: function(accountID,chain) {
                let account = this.$store.state.AccountStore.accountlist.find(x => { return (x.accountID==accountID && x.chain==chain);});
                return formatAccount(account, true);
            }
        }
    };
</script>
