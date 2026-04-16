<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Square,
  X,
} from "lucide-vue-next";
import {
  useLogs,
  type LogFilterRule,
  type LogLevel,
  type LogStatus,
  type LogTarget,
} from "@/composables/useLogs";

type SelectValueType = {
  target: LogTarget | null;
  level: LogLevel | null;
};

const selectValue = ref<SelectValueType>({
  target: null,
  level: null,
});
const {
  filters,
  status,
  actionStatus,
  isBusy,
  targetOptions,
  levelOptions,
  setFilters,
  connect,
  pause,
  resume,
  stop,
  reconnect,
  clearLogs,
} = useLogs();
const { t } = useI18n();

const searchParams = ref<LogFilterRule[]>([...filters.value]);

watch(
  filters,
  (nextFilters) => {
    searchParams.value = [...nextFilters];
  },
  { deep: true },
);

watch(
  searchParams,
  (nextSearchParams, previousSearchParams) => {
    const nextSerialized = JSON.stringify(nextSearchParams);
    const previousSerialized = JSON.stringify(previousSearchParams);
    if (nextSerialized === previousSerialized) return;
    void setFilters(nextSearchParams);
  },
  { deep: true },
);

const connectStatus = computed<LogStatus>(() => status.value);
const isConnecting = computed(() => actionStatus.value === "connecting");
const isDisconnecting = computed(() => actionStatus.value === "disconnecting");
const isReconnecting = computed(() => {
  return (
    actionStatus.value === "reconnecting" ||
    actionStatus.value === "updatingFilters"
  );
});

const addSearchParams = (value: SelectValueType) => {
  if (!value.target || !value.level) return;
  const isDuplicate = searchParams.value.some(
    (item) => item.target === value.target && item.level === value.level,
  );

  if (!isDuplicate) {
    searchParams.value = [...searchParams.value, value as LogFilterRule];
  }

  selectValue.value = {
    target: null,
    level: null,
  };
};

const removeSearchParam = (index: number) => {
  searchParams.value = searchParams.value.filter((_, itemIndex) => {
    return itemIndex !== index;
  });
};
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="flex flex-1 flex-wrap items-center gap-2">
        <div class="w-[220px] max-w-full">
          <Select
            v-model="selectValue.target"
            :placeholder="t('dashboard.logsPanel.filters.select')"
          >
            <SelectTrigger class="w-full">
              <SelectValue
                :placeholder="t('dashboard.logsPanel.filters.target')"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{{
                  t("dashboard.logsPanel.filters.target")
                }}</SelectLabel>
                <SelectItem
                  v-for="target in targetOptions"
                  :key="target"
                  :value="target"
                >
                  {{ target }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div class="w-[220px] max-w-full">
          <Select
            v-model="selectValue.level"
            :placeholder="t('dashboard.logsPanel.filters.select')"
          >
            <SelectTrigger class="w-full">
              <SelectValue
                :placeholder="t('dashboard.logsPanel.filters.level')"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{{
                  t("dashboard.logsPanel.filters.level")
                }}</SelectLabel>
                <SelectItem
                  v-for="level in levelOptions"
                  :key="level"
                  :value="level"
                >
                  {{ level.toUpperCase() }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Button :disabled="isBusy" @click="addSearchParams(selectValue)">
            <Loader2
              v-if="actionStatus === 'updatingFilters'"
              class="h-4 w-4 animate-spin"
            />
            <Plus v-else />
            {{ t("dashboard.logsPanel.actions.addFilter") }}
          </Button>
        </div>
      </div>

      <div class="flex gap-2">
        <Button
          v-show="connectStatus === 'disconnected' || connectStatus === 'error'"
          :disabled="isBusy"
          @click="connect"
        >
          <Loader2 v-if="isConnecting" class="h-4 w-4 animate-spin" />
          <Play v-else />
          {{
            isConnecting
              ? t("dashboard.logsPanel.actions.connecting")
              : t("dashboard.logsPanel.actions.connect")
          }}
        </Button>
        <Button
          v-show="connectStatus === 'connected'"
          :disabled="isBusy"
          @click="pause"
        >
          <Pause />
          {{ t("dashboard.logsPanel.actions.pause") }}
        </Button>
        <Button
          v-show="connectStatus === 'paused'"
          :disabled="isBusy"
          @click="resume"
        >
          <Play />
          {{ t("dashboard.logsPanel.actions.resume") }}
        </Button>
        <Button
          v-show="
            connectStatus === 'connected' ||
            connectStatus === 'paused' ||
            connectStatus === 'error'
          "
          :disabled="isBusy"
          @click="stop"
        >
          <Loader2 v-if="isDisconnecting" class="h-4 w-4 animate-spin" />
          <Square v-else />
          {{
            isDisconnecting
              ? t("dashboard.logsPanel.actions.disconnecting")
              : t("dashboard.logsPanel.actions.stop")
          }}
        </Button>
        <Button
          v-show="
            connectStatus === 'connected' ||
            connectStatus === 'paused' ||
            connectStatus === 'error'
          "
          :disabled="isBusy"
          @click="reconnect"
        >
          <Loader2 v-if="isReconnecting" class="h-4 w-4 animate-spin" />
          <RefreshCcw v-else />
          {{
            isReconnecting
              ? t("dashboard.logsPanel.actions.reconnecting")
              : t("dashboard.logsPanel.actions.reconnect")
          }}
        </Button>
        <Button variant="outline" :disabled="isBusy" @click="clearLogs">
          {{ t("dashboard.logsPanel.actions.clear") }}
        </Button>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <Badge
        v-for="(item, index) in searchParams"
        :key="index"
        variant="secondary"
        class="h-6 gap-1 px-2 text-[11px]"
      >
        {{ item.target }}: {{ item.level }}
        <Button
          variant="ghost"
          size="icon-sm"
          class="m-0 size-4 rounded-full p-0 hover:bg-transparent"
          @click="removeSearchParam(index)"
        >
          <X class="size-3" />
        </Button>
      </Badge>
    </div>
  </div>
</template>
