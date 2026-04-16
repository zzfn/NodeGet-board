<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Loader2 } from "lucide-vue-next";
import { useLogs } from "@/composables/useLogs";
import LogsItem from "./logsItem.vue";

const { logs, error, status, actionStatus, isBusy } = useLogs();
const { t } = useI18n();
const displayLogs = computed(() => [...logs.value].reverse());
const loadingText = computed(() => {
  if (actionStatus.value === "connecting") {
    return t("dashboard.logsPanel.loading.connecting");
  }
  if (actionStatus.value === "disconnecting") {
    return t("dashboard.logsPanel.loading.disconnecting");
  }
  if (actionStatus.value === "reconnecting") {
    return t("dashboard.logsPanel.loading.reconnecting");
  }
  if (actionStatus.value === "updatingFilters") {
    return t("dashboard.logsPanel.loading.updatingFilters");
  }
  return t("common.loading");
});
</script>

<template>
  <div
    class="mt-4 max-h-[60vh] overflow-y-auto rounded-md border bg-background/40 p-3"
  >
    <div class="space-y-3">
      <div
        v-if="isBusy"
        class="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
      >
        <Loader2 class="h-4 w-4 animate-spin" />
        <span>{{ loadingText }}</span>
      </div>

      <div
        v-if="error"
        class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {{ error }}
      </div>

      <div
        v-if="logs.length === 0"
        class="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground"
      >
        <span v-if="status === 'connecting'">
          {{ t("dashboard.logsPanel.empty.connecting") }}
        </span>
        <span v-else-if="isBusy">{{ loadingText }}</span>
        <span v-else>{{ t("dashboard.logsPanel.empty.idle") }}</span>
      </div>

      <div v-else class="flex flex-col gap-2">
        <LogsItem v-for="item in displayLogs" :key="item.id" :item="item" />
      </div>
    </div>
  </div>
</template>
