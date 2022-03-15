<script setup>
    import { computed } from 'vue';
    import getBlockchainAPI from "../lib/blockchains/blockchainFactory";
    import {formatChain} from "../lib/formatter";
    import { shell } from 'electron';
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n({ useScope: 'global' });

    const props = defineProps({
      account: Object
    });

    let chainLabel = computed(() => {
      return formatChain(props.account.chain);
    });

    let explorer = computed(() => {
      return getBlockchainAPI(props.account.chain).getExplorer(props.account);
    });

    let accessType = computed(() => {
      let type = getBlockchainAPI(props.account.chain).getAccessType();
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
  <div>
    <p>
        {{ t('common.account_details_lbl') }}
    </p>
    <ui-card elevated class="wideCard">
        <ui-list v-if="account">
          <ui-item :key="chain">
              <ui-item-text-content>
                  <ui-item-text1>
                      {{ t('common.account_details_chaim_lbl') }}
                  </ui-item-text1>
                  <ui-item-text2>
                      {{ chainLabel }}
                  </ui-item-text2>
              </ui-item-text-content>
          </ui-item>
          <ui-item :key="accountName">
              <ui-item-text-content>
                  <ui-item-text1>
                      {{ accessType }}
                  </ui-item-text1>
                  <ui-item-text2>
                      {{ account.accountName }}
                  </ui-item-text2>
              </ui-item-text-content>
          </ui-item>
          <ui-item :key="accountID">
              <ui-item-text-content v-if="account.accountName != account.accountID">
                  <ui-item-text1>
                      {{ t('common.account_details_id_lbl') }}
                  </ui-item-text1>
                  <ui-item-text2>
                      {{ account.accountID }}
                  </ui-item-text2>
              </ui-item-text-content>
          </ui-item>
        </ui-list>

        <ui-card-actions full-bleed v-if="explorer">
          <ui-button @click="openExplorer(account)" class="step_btn">
            {{ t('common.account_details_explorer_lbl') }}
          </ui-button>
        </ui-card-actions>
    </ui-card>
  </div>
</template>
