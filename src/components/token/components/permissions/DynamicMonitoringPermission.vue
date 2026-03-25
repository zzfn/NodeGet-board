<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PermissionEntry } from "../../type";
import { Button } from "@/components/ui/button";
import { arePermissionEntriesEqual } from "./permissionsState";

const FIELDS = ["cpu", "system", "gpu"] as const;

const props = defineProps<{ modelValue: PermissionEntry[] }>();
const emits = defineEmits<{
  (e: "update:modelValue", value: PermissionEntry[]): void;
}>();
const { t } = useI18n();

const readTargets = ref<string[]>([]);
const writeEnabled = ref(false);
const hydrating = ref(false);

const toggleReadTarget = (target: string) => {
  const index = readTargets.value.indexOf(target);
  if (index >= 0) {
    readTargets.value.splice(index, 1);
    return;
  }
  readTargets.value.push(target);
};

const toggleWrite = () => {
  writeEnabled.value = !writeEnabled.value;
};

const build = (): PermissionEntry[] => {
  const result: PermissionEntry[] = [];
  for (const field of readTargets.value)
    result.push({ dynamic_monitoring: { read: field } });
  if (writeEnabled.value) result.push({ dynamic_monitoring: "write" });
  return result;
};

const hydrate = (entries: PermissionEntry[]) => {
  readTargets.value = [];
  writeEnabled.value = false;
  for (const entry of entries || []) {
    const value = entry?.dynamic_monitoring;
    if (value === "write") {
      writeEnabled.value = true;
      continue;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const obj = value as Record<string, unknown>;
    if (typeof obj.read === "string" && !readTargets.value.includes(obj.read))
      readTargets.value.push(obj.read);
  }
};

watch(
  () => props.modelValue,
  (value) => {
    const nextEntries = Array.isArray(value) ? value : [];
    if (arePermissionEntriesEqual(nextEntries, build())) return;

    hydrating.value = true;
    hydrate(nextEntries);
    hydrating.value = false;
  },
  { immediate: true, deep: true },
);

watch(
  [readTargets, writeEnabled],
  () => {
    if (hydrating.value) return;
    const nextEntries = build();
    if (arePermissionEntriesEqual(nextEntries, props.modelValue)) return;
    emits("update:modelValue", nextEntries);
  },
  { deep: true },
);
</script>

<template>
  <details class="rounded-md border p-3" open>
    <summary class="cursor-pointer select-none text-sm font-medium">
      {{
        t(
          "dashboard.token.permissionsConfig.limitItem.permissionCard.dynamicMonitoring.title",
        )
      }}
    </summary>
    <div class="mt-3 space-y-2">
      <div class="text-xs text-muted-foreground">
        {{
          t(
            "dashboard.token.permissionsConfig.limitItem.permissionCard.dynamicMonitoring.read",
          )
        }}
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="field in FIELDS"
          :key="`dm-r-${field}`"
          type="button"
          size="sm"
          :variant="readTargets.includes(field) ? 'default' : 'outline'"
          @click="toggleReadTarget(field)"
          >{{ field }}</Button
        >
      </div>
      <div class="text-xs text-muted-foreground">
        {{
          t(
            "dashboard.token.permissionsConfig.limitItem.permissionCard.dynamicMonitoring.write",
          )
        }}
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          :variant="writeEnabled ? 'default' : 'outline'"
          @click="toggleWrite"
          >Write</Button
        >
      </div>
    </div>
  </details>
</template>
