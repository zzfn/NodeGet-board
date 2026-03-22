<script setup lang="ts">
import { ref, watch } from "vue";
import type { PermissionEntry } from "../../type";

const props = defineProps<{ modelValue: PermissionEntry[] }>();
const emits = defineEmits<{
  (e: "update:modelValue", value: PermissionEntry[]): void;
}>();

const readTargetsText = ref("");
const deleteTargetsText = ref("");
const hydrating = ref(false);

const parseList = (value: string) => [
  ...new Set(
    value
      .split(/[\n,]+/g)
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];

const build = (): PermissionEntry[] => {
  const result: PermissionEntry[] = [];
  for (const target of parseList(readTargetsText.value)) {
    result.push({ crontab_result: { read: target } });
  }
  for (const target of parseList(deleteTargetsText.value)) {
    result.push({ crontab_result: { delete: target } });
  }
  return result;
};

const hydrate = (entries: PermissionEntry[]) => {
  const reads: string[] = [];
  const deletes: string[] = [];

  for (const entry of entries || []) {
    const value = entry?.crontab_result;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;

    const obj = value as Record<string, unknown>;
    if (typeof obj.read === "string") reads.push(obj.read);
    if (typeof obj.delete === "string") deletes.push(obj.delete);
  }

  readTargetsText.value = [...new Set(reads)].join("\n");
  deleteTargetsText.value = [...new Set(deletes)].join("\n");
};

watch(
  () => props.modelValue,
  (value) => {
    hydrating.value = true;
    hydrate(Array.isArray(value) ? value : []);
    hydrating.value = false;
  },
  { immediate: true, deep: true },
);

watch(
  [readTargetsText, deleteTargetsText],
  () => {
    if (hydrating.value) return;
    emits("update:modelValue", build());
  },
  { deep: true },
);
</script>

<template>
  <details class="rounded-md border p-3" open>
    <summary class="cursor-pointer select-none text-sm font-medium">
      CrontabResult
    </summary>
    <div class="mt-3 space-y-3">
      <div class="grid gap-3 md:grid-cols-2">
        <div class="space-y-1">
          <div class="text-xs text-muted-foreground">Read targets</div>
          <textarea
            v-model="readTargetsText"
            class="flex min-h-[90px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
            placeholder="history_*"
          />
        </div>
        <div class="space-y-1">
          <div class="text-xs text-muted-foreground">Delete targets</div>
          <textarea
            v-model="deleteTargetsText"
            class="flex min-h-[90px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
            placeholder="temp_*"
          />
        </div>
      </div>
    </div>
  </details>
</template>
