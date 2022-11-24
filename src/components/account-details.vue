<script setup>
    import { computed } from 'vue';
    import {formatChain} from "../lib/formatter";
    import { shell } from 'electron';
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });

    const props = defineProps({
        account: {
            type: Object,
            required: true,
            default() {
                return {}
            }
        },
        blockchain: {
            type: Object,
            required: true,
            default() {
                return {}
            }
        }
    });

    let chainLabel = computed(() => {
        return formatChain(props.account.chain);
    });

    let explorer = computed(() => {
        if (!props.blockchain) {
            return;
        }
        return props.blockchain.getExplorer(props.account);
    });

    let accessType = computed(() => {
        if (!props.blockchain) {
            return;
        }
        let type = props.blockchain.getAccessType();
        return type == "account"
            ? t('common.account_details_name_lbl')
            : t('common.account_details_address_lbl');
    });

    function openExplorer(account) {
        // TODO: Copy/Paste link for external browser instead?
        shell.openExternal(explorer.value);
    }

</script>

<template>
    <div style="padding:5px">
        <span>
            {{ t('common.account_details_lbl') }}
            <ui-button
                v-if="explorer"
                class="step_btn"
                outline
                @click="openExplorer(account)"
            >
                {{ t('common.account_details_explorer_lbl') }}
            </ui-button>
        </span>
        <ui-card
            v-shadow="1"
            outlined
        >
            <ui-list v-if="account">
                <ui-item :key="chainLabel">
                    <ui-item-text-content>
                        {{ t('common.account_details_chaim_lbl') }}
                    </ui-item-text-content>
                    <ui-item-last-content>
                        {{ chainLabel }}
                    </ui-item-last-content>
                </ui-item>
                <ui-item :key="account.accountName">
                    <ui-item-text-content>
                        {{ accessType }}
                    </ui-item-text-content>
                    <ui-item-last-content>
                        {{ account.accountName }}
                    </ui-item-last-content>
                </ui-item>
                <ui-item :key="account.accountID">
                    <ui-item-text-content v-if="account.accountName != account.accountID">
                        {{ t('common.account_details_id_lbl') }}
                    </ui-item-text-content>
                    <ui-item-last-content>
                        {{ account.accountID }}
                    </ui-item-last-content>
                </ui-item>
            </ui-list>
        </ui-card>
    </div>
</template>
