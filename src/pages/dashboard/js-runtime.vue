<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";
import { Braces, Plus } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import WorkerTable from "@/components/js-runtime/WorkerTable.vue";
import WorkerFormDialog from "@/components/js-runtime/WorkerFormDialog.vue";
import { useJsRuntime } from "@/composables/useJsRuntime";

definePage({
  meta: {
    title: "router.jsRuntime",
    icon: Braces,
    order: 10,
    group: "router.group.advanced",
  },
});

const { t } = useI18n();
const runtime = useJsRuntime();

const deletingIds = ref<string[]>([]);
const saveLoading = ref(false);
const dialogOpen = ref(false);

const loadWorkers = async () => {
  await runtime.fetchWorkers();
};

onMounted(() => {
  loadWorkers();
});

const handleAdd = async (name: string, content: string) => {
  saveLoading.value = true;
  try {
    await runtime.addWorker(name, content);
    toast.success(t("dashboard.jsRuntime.createSuccess"));
    dialogOpen.value = false;
    await loadWorkers();
  } catch (e: any) {
    toast.error(e.message || "Failed to create worker");
  } finally {
    saveLoading.value = false;
  }
};

const handleDelete = async (id: string) => {
  deletingIds.value.push(id);
  try {
    await runtime.deleteWorker(id);
    toast.success(t("dashboard.jsRuntime.deleteSuccess"));
    await loadWorkers();
  } catch (e: any) {
    toast.error(e.message || "Failed to delete worker");
  } finally {
    deletingIds.value = deletingIds.value.filter((i) => i !== id);
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-semibold">
          {{ t("dashboard.jsRuntime.title") }}
        </h1>
        <p class="text-sm text-muted-foreground mt-1">
          {{ t("dashboard.jsRuntime.desc") }}
        </p>
      </div>
      <Button @click="dialogOpen = true">
        <Plus class="mr-2 h-4 w-4" />
        {{ t("dashboard.jsRuntime.addWorker") }}
      </Button>
    </div>

    <WorkerTable
      :workers="runtime.workers.value"
      :loading="runtime.loading.value"
      :deleting-ids="deletingIds"
      @delete="handleDelete"
    />

    <WorkerFormDialog
      v-model:open="dialogOpen"
      :loading="saveLoading"
      @save="handleAdd"
    />
  </div>
</template>
