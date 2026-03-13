<script setup lang="ts">
import { ref, onMounted } from "vue";
import { toast } from "vue-sonner";
import { useKv } from "@/composables/useKv";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import KvNamespaceTable from "@/components/kv/KvNamespaceTable.vue";
import KvEntryTable from "@/components/kv/KvEntryTable.vue";
import KvFlatTable from "@/components/kv/KvFlatTable.vue";
import KvNodeTable from "@/components/kv/KvNodeTable.vue";
import KvCreateNamespaceDialog from "@/components/kv/KvCreateNamespaceDialog.vue";
import KvViewDialog from "@/components/kv/KvViewDialog.vue";
import KvSetDialog from "@/components/kv/KvSetDialog.vue";

const kv = useKv();

const activeTab = ref<"list" | "flat" | "node">("list");
const selectedNamespace = ref<string | null>(null);

// Create namespace dialog
const createOpen = ref(false);
const createLoading = ref(false);
const createError = ref<string | null>(null);

// View dialog
const viewOpen = ref(false);
const viewKey = ref("");
const viewValue = ref<unknown>(undefined);
const viewLoading = ref(false);

// Edit dialog
const editOpen = ref(false);
const editKey = ref<string | undefined>(undefined);
const editValue = ref<unknown>(undefined);
const editLoading = ref(false);

onMounted(() => kv.init());

const enterNamespace = async (ns: string) => {
  selectedNamespace.value = ns;
  kv.namespace.value = ns;
  await kv.fetchKeys();
};

const backToList = () => {
  selectedNamespace.value = null;
  kv.entries.value = [];
};

const handleCreate = async (ns: string) => {
  createError.value = null;
  createLoading.value = true;
  try {
    await kv.createNamespace(ns);
    createOpen.value = false;
    await kv.fetchNamespaces();
    toast.success(`命名空间 "${ns}" 创建成功`);
  } catch (e: unknown) {
    createError.value = e instanceof Error ? e.message : String(e);
  } finally {
    createLoading.value = false;
  }
};

const handleView = async (key: string) => {
  viewKey.value = key;
  viewValue.value = undefined;
  viewLoading.value = true;
  viewOpen.value = true;
  try {
    viewValue.value = await kv.getValue(key);
  } finally {
    viewLoading.value = false;
  }
};

const handleEdit = async (key: string) => {
  editKey.value = key;
  editValue.value = undefined;
  editLoading.value = true;
  editOpen.value = true;
  try {
    editValue.value = await kv.getValue(key);
  } finally {
    editLoading.value = false;
  }
};

const handleSave = async (key: string, value: unknown) => {
  try {
    await kv.setValue(key, value);
    editOpen.value = false;
    if (editKey.value === undefined) {
      await kv.fetchKeys();
    }
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "保存失败");
  }
};

const handleDelete = async (key: string) => {
  if (!confirm(`确定要删除 key "${key}" 吗？`)) return;
  try {
    await kv.deleteKey(key);
    toast.success("删除成功");
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "删除失败");
  }
};

const handleNsDelete = (_ns: string) => {
  toast.info(`删除命名空间功能开发中`);
};

const handleNsRename = (_ns: string) => {
  toast.info(`重命名命名空间功能开发中`);
};

const openAddKey = () => {
  editKey.value = undefined;
  editValue.value = undefined;
  editOpen.value = true;
};
</script>

<template>
  <div class="h-full flex flex-col space-y-4">
    <h1 class="text-2xl font-bold mb-2">KV 管理</h1>

    <!-- Tab 栏（仅 namespace 列表视图时显示）-->
    <Tabs
      v-if="!selectedNamespace"
      :model-value="activeTab"
      @update:model-value="activeTab = $event as any"
    >
      <TabsList>
        <TabsTrigger value="list">普通视图</TabsTrigger>
        <TabsTrigger value="flat">平铺视图</TabsTrigger>
        <TabsTrigger value="node">节点视图</TabsTrigger>
      </TabsList>

      <!-- 普通视图：namespace 列表 -->
      <TabsContent value="list" class="mt-4">
        <KvNamespaceTable
          :namespaces="kv.namespaces.value"
          :loading="kv.namespacesLoading.value"
          @select="enterNamespace"
          @open-create="createOpen = true"
          @delete="handleNsDelete"
          @rename="handleNsRename"
        />
      </TabsContent>

      <!-- 平铺视图 -->
      <TabsContent value="flat" class="mt-4">
        <KvFlatTable :namespaces="kv.namespaces.value" />
      </TabsContent>

      <!-- 节点视图 -->
      <TabsContent value="node" class="mt-4">
        <KvNodeTable />
      </TabsContent>
    </Tabs>

    <!-- Namespace 详情 -->
    <template v-if="selectedNamespace">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="backToList">返回</Button>
          <p class="text-sm text-muted-foreground">
            命名空间
            <span class="font-mono font-medium text-foreground">{{
              selectedNamespace
            }}</span>
            的所有 Keys（{{ kv.entries.value.length }}）
          </p>
        </div>
        <Button size="sm" @click="openAddKey"> 新增 Key </Button>
      </div>

      <KvEntryTable
        :entries="kv.entries.value"
        :loading="kv.loading.value"
        @view="handleView"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </template>

    <!-- Dialogs -->
    <KvCreateNamespaceDialog
      :open="createOpen"
      :loading="createLoading"
      :error="createError"
      @update:open="createOpen = $event"
      @create="handleCreate"
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
