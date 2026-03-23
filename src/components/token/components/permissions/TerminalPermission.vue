<script setup lang="ts">
import { ref, watch } from "vue";
import type { PermissionEntry } from "../../type";
import { Button } from "@/components/ui/button";
import { arePermissionEntriesEqual } from "./permissionsState";

const props = defineProps<{ modelValue: PermissionEntry[] }>();
const emits = defineEmits<{
  (e: "update:modelValue", value: PermissionEntry[]): void;
}>();

const connect = ref(false);
const hydrating = ref(false);

const build = (): PermissionEntry[] =>
  connect.value ? [{ terminal: "connect" }] : [];

const hydrate = (entries: PermissionEntry[]) => {
  connect.value = entries.some((entry) => entry?.terminal === "connect");
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

watch(connect, () => {
  if (hydrating.value) return;
  const nextEntries = build();
  if (arePermissionEntriesEqual(nextEntries, props.modelValue)) return;
  emits("update:modelValue", nextEntries);
});
</script>

<template>
  <details class="rounded-md border p-3" open>
    <summary class="cursor-pointer select-none text-sm font-medium">
      Terminal
    </summary>
    <div class="mt-3 flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        :variant="connect ? 'default' : 'outline'"
        @click="connect = !connect"
        >Connect</Button
      >
    </div>
  </details>
</template>
