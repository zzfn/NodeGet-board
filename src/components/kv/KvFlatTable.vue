<script setup lang="ts">
import { ref, onMounted } from "vue";
import { toast } from "vue-sonner";
import { useKv } from "@/composables/useKv";
import KvEntryTable from "./KvEntryTable.vue";
import KvViewDialog from "./KvViewDialog.vue";
import KvSetDialog from "./KvSetDialog.vue";

interface FlatEntry {
  namespace: string;
  key: string;
  value: unknown;
}

const props = defineProps<{
  namespaces: string[];
}>();

const kv = useKv();
const flatEntries = ref<FlatEntry[]>([]);
const flatLoading = ref(false);

const viewOpen = ref(false);
const viewKey = ref("");
const viewValue = ref<unknown>(undefined);
const viewLoading = ref(false);

const editOpen = ref(false);
const editKey = ref<string | undefined>(undefined);
const editValue = ref<unknown>(undefined);
const editLoading = ref(false);
const editNamespace = ref("");

const loadAll = async () => {
  flatLoading.value = true;
  flatEntries.value = [];
  await Promise.allSettled(
    props.namespaces.map(async (ns) => {
      kv.namespace.value = ns;
      await kv.fetchKeys();
      const nsEntries: FlatEntry[] = kv.entries.value.map((e) => ({
        namespace: ns,
        key: e.key,
        value: e.value,
      }));
      flatEntries.value.push(...nsEntries);
    }),
  );
  flatLoading.value = false;
};

onMounted(loadAll);

const handleView = async (ns: string, key: string) => {
  viewKey.value = key;
  viewValue.value = undefined;
  viewLoading.value = true;
  viewOpen.value = true;
  kv.namespace.value = ns;
  try {
    viewValue.value = await kv.getValue(key);
  } finally {
    viewLoading.value = false;
  }
};

const handleEdit = async (ns: string, key: string) => {
  editNamespace.value = ns;
  editKey.value = key;
  editValue.value = undefined;
  editLoading.value = true;
  editOpen.value = true;
  kv.namespace.value = ns;
  try {
    editValue.value = await kv.getValue(key);
  } finally {
    editLoading.value = false;
  }
};

const handleSave = async (key: string, value: unknown) => {
  kv.namespace.value = editNamespace.value;
  try {
    await kv.setValue(key, value);
    editOpen.value = false;
    const entry = flatEntries.value.find(
      (e) => e.namespace === editNamespace.value && e.key === key,
    );
    if (entry) entry.value = value;
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "更新失败");
  }
};

const handleDelete = async (ns: string, key: string) => {
  if (!confirm(`确定要删除 "${ns}/${key}" 吗？`)) return;
  kv.namespace.value = ns;
  try {
    await kv.deleteKey(key);
    flatEntries.value = flatEntries.value.filter(
      (e) => !(e.namespace === ns && e.key === key),
    );
    toast.success("删除成功");
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "删除失败");
  }
};

// flatEntries is passed directly; KvEntryTable uses (entry as any).namespace for showNamespace columns
</script>

<template>
  <div>
    <KvEntryTable
      :entries="flatEntries as any"
      :loading="flatLoading"
      :show-namespace="true"
      @view="
        (key) => {
          const e = flatEntries.find((x) => x.key === key);
          if (e) handleView(e.namespace, key);
        }
      "
      @edit="
        (key) => {
          const e = flatEntries.find((x) => x.key === key);
          if (e) handleEdit(e.namespace, key);
        }
      "
      @delete="
        (key) => {
          const e = flatEntries.find((x) => x.key === key);
          if (e) handleDelete(e.namespace, key);
        }
      "
    />

    <KvViewDialog
      :open="viewOpen"
      :kv-key="viewKey"
      :loading="viewLoading"
      :value="viewValue"
      @update:open="viewOpen = $event"
    />
    <KvSetDialog
      :open="editOpen"
      :edit-key="editKey"
      :edit-value="editValue"
      :loading="editLoading"
      @update:open="editOpen = $event"
      @save="handleSave"
    />
  </div>
</template>
