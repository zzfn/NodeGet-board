<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronDown, ChevronRight } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LogEntry } from "@/composables/useLogs";

const props = defineProps<{
  item: LogEntry;
}>();

const isOpen = ref(false);
const { t } = useI18n();

const levelClass = computed(() => {
  const level = props.item.level.toUpperCase();
  if (level === "ERROR") return "text-red-600";
  if (level === "WARN") return "text-amber-600";
  if (level === "DEBUG") return "text-blue-600";
  if (level === "TRACE") return "text-fuchsia-600";
  return "text-emerald-600";
});

const formattedTimestamp = computed(() => {
  const date = new Date(props.item.timestamp);
  if (Number.isNaN(date.getTime())) {
    return props.item.timestamp;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
});

const formattedFields = computed(() => {
  if (Object.keys(props.item.fields).length === 0) return "";
  return JSON.stringify(props.item.fields, null, 2);
});
</script>

<template>
  <Collapsible v-model:open="isOpen">
    <Card class="transition-colors hover:bg-muted/30">
      <CollapsibleTrigger as-child>
        <CardHeader
          :class="
            isOpen ? 'cursor-pointer px-4 py-2.5' : 'cursor-pointer px-4 py-2'
          "
        >
          <div
            class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5"
          >
            <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <component
                :is="isOpen ? ChevronDown : ChevronRight"
                class="size-4 shrink-0 text-muted-foreground"
              />
              <Badge
                variant="outline"
                :class="cn('font-mono text-xs', levelClass)"
              >
                {{ item.level }}
              </Badge>
              <Badge variant="secondary" class="font-mono text-xs">
                {{ item.target }}
              </Badge>
              <CardTitle
                class="basis-full text-sm font-medium break-all sm:min-w-0 sm:flex-1 sm:basis-auto sm:truncate sm:break-normal"
              >
                {{ item.message || "-" }}
              </CardTitle>
            </div>

            <div
              class="w-full font-mono text-xs text-muted-foreground sm:w-auto sm:shrink-0"
            >
              {{ formattedTimestamp }}
            </div>
          </div>
        </CardHeader>
      </CollapsibleTrigger>

      <CardContent v-if="isOpen" class="space-y-2.5 pt-0 pb-3">
        <div>
          <div class="mb-1 text-xs font-medium text-muted-foreground">
            {{ t("dashboard.logsPanel.details.fields") }}
          </div>
          <pre
            v-if="formattedFields"
            class="overflow-x-auto rounded-md bg-muted p-3 text-xs"
            >{{ formattedFields }}</pre
          >
          <div
            v-else
            class="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground"
          >
            {{ t("common.noData") }}
          </div>
        </div>

        <div class="space-y-2">
          <div class="text-xs font-medium text-muted-foreground">
            {{ t("dashboard.logsPanel.details.spans") }}
          </div>
          <template v-if="item.spans.length > 0">
            <div
              v-for="(span, index) in item.spans"
              :key="`${item.id}-span-${index}`"
              class="rounded-md border px-3 py-2"
            >
              <div class="font-mono text-xs font-medium">
                {{ span.name || "-" }}
              </div>
              <div
                v-if="span.fields"
                class="mt-1 text-xs text-muted-foreground"
              >
                {{ span.fields }}
              </div>
            </div>
          </template>
          <div
            v-else
            class="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground"
          >
            {{ t("common.noData") }}
          </div>
        </div>
      </CardContent>
    </Card>
  </Collapsible>
</template>
