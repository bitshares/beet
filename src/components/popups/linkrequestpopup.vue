<script setup>
    import { ipcRenderer } from 'electron';
    import { ref, onMounted, computed } from "vue";
    import RendererLogger from "../../lib/RendererLogger";
    import {formatChain, formatAccount} from "../../lib/formatter";
    import getBlockchainAPI from "../../lib/blockchains/blockchainFactory";
    import sha512 from "crypto-js/sha512.js";

    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });
    const logger = new RendererLogger();

    let chosenAccount = ref(-1);

    const props = defineProps({
        request: {
            type: Object,
            required: true,
            default() {
                return {}
            }
        },
        accounts: {
            type: Array,
            required: true,
            default() {
                return []
            }
        },
        existingLinks: {
            type: Array,
            required: false,
            default() {
                return []
            }
        }
    });

    let requestText = computed(() => {
        if (!props.request) {
            return '';
        }
        return t(
            'operations.link.request',
            {
                appName: props.request.appName,
                origin: props.request.origin,
                chain: props.request.chain
            }
        );
    });

    let secondText = computed(() => {
        return t('operations.link.request_fresh', {chain: props.request.chain });
    });

    let chainOperations = computed(() => {
        let types = getBlockchainAPI(props.request.chain).getOperationTypes();
        if (!props.request.injectables.length) {
            // All operations are required
            return types.map(type => `${type.id}: ${type.method.method.replaceAll("_", " ")}`);
        }

        let injectChips = [];
        for (let i = 0; i < props.request.injectables.length; i++) {
            // Subset of operations are required
            if (!types[props.request.injectables[i]]) {
                injectChips = []; // invalid op will nullify link request
                break;
            } else {
                injectChips.push({
                    text: `${types[props.request.injectables[i]].id}: ` + t(`operations.injected.BTS.${types[props.request.injectables[i]].method}`),
                    tooltip: t(`operations.injected.BTS.${types[props.request.injectables[i]].tooltip}`)
                })
            }   
        }
        if (!injectChips.length) {
            // Avoid rendering warning
            return null;
        }
        return injectChips;
    });

    /*
     * Creating the select items
     */
    let accountOptions = computed(() => {
        if (!props.accounts || !props.accounts.length) {
            return [];
        }

        return props.accounts.map((account, i) => {
            return {
                label: !account.accountID && account.trackId == 0
                    ? `account ${i}` // TODO: Replace placeholder!
                    : `${formatChain(account.chain)}: ${formatAccount(account)}`,
                value: i
            };
        });
    });

    onMounted(() => {
        logger.debug("Link Popup initialised");
    })

    function _clickedAllow() {
        let approvedAccount = props.accounts[chosenAccount.value];

        ipcRenderer.send(
            "clickedAllow",
            {
                result: {
                    name: approvedAccount.accountName,
                    chain: approvedAccount.chain,
                    id: approvedAccount.accountID
                },
                request: {
                    id: props.request.id
                }
            }
        );
    }

    function _clickedDeny() {
        ipcRenderer.send(
            "clickedDeny",
            {
                result: {canceled: true},
                request: {id: props.request.id}
            }
        );
    }
</script>

<template>
    <div style="padding:5px">
        <div v-tooltip="t('operations.link.request_tooltip')">
            {{ requestText }}
        </div>
        <br>
        <div v-if="existingLinks.length > 0">
            {{ secondText }}
        </div>
        <br>
        <div v-if="chainOperations && chainOperations.length">
            <ui-chips id="input-chip-set" type="input" :items="list">
                <ui-chip
                    v-for="item in chainOperations"
                    :key="sha512(item.text).toString()"
                    v-tooltip="item.tooltip"
                >
                    {{ item.text }}
                </ui-chip>
            </ui-chips>
        </div>
        <div v-if="accountOptions && accountOptions.length > 0">
            <select
                id="account_select"
                v-model="chosenAccount"
                class="form-control mb-3"
                required
            >
                <option
                    selected
                    disabled
                    value=""
                >
                    {{ t('operations.link.account_select') }}
                </option>
                <option
                    v-for="account in accountOptions"
                    :key="account.value"
                    :value="account.value"
                >
                    <span>
                        {{ account.label }}
                    </span>
                </option>
            </select>
        </div>
        <div v-else>
            {{ t('operations.link.account_missing') }}
        </div>
        <br>
        <div v-if="chosenAccount == -1 || !chainOperations">
            <ui-alert v-if="!chainOperations" state="error">
                {{ t('operations.link.invalid_operations') }}
            </ui-alert>
            <ui-button
                style="margin-right:5px"
                disabled
            >
                {{ t('operations.link.accept_btn') }}
            </ui-button>
            <ui-button
                raised
                @click="_clickedDeny()"
            >
                {{ t('operations.link.reject_btn') }}
            </ui-button>
        </div>
        <div v-else>
            <ui-button
                raised
                style="margin-right:5px"
                @click="_clickedAllow()"
            >
                {{ t('operations.link.accept_btn') }}
            </ui-button>
            <ui-button
                raised
                @click="_clickedDeny()"
            >
                {{ t('operations.link.reject_btn') }}
            </ui-button>
        </div>
    </div>
</template>
