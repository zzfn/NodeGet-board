<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";
import {
  Loader2,
  ChevronLeft,
  Play,
  Clock,
  Eye,
  Save,
  Trash2,
} from "lucide-vue-next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Codemirror } from "vue-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import { useJsRuntime, type JsWorker } from "@/composables/useJsRuntime";
import { useThemeStore } from "@/stores/theme";
import { cn } from "@/lib/utils";

definePage({
  meta: {
    hidden: true,
  },
});

const route = useRoute("/dashboard/js-runtime/[id]");
const router = useRouter();
const { t } = useI18n();
const runtime = useJsRuntime();
const themeStore = useThemeStore();

const workerId = computed(() => route.params.id);
const worker = ref<JsWorker | null>(null);
const loading = ref(true);
const activeTab = ref("overview");

// Content Tab State
const content = ref("");
const runParams = ref("{}");
const runEnv = ref("{}");
const runResult = ref<any>(null);
const runLoading = ref(false);
const saveLoading = ref(false);

// Settings Tab State
const envVars = ref<{ key: string; value: string }[]>([]);
const workerRoute = ref("");
const cleanTime = ref("");

const extensions = computed(() => [
  javascript(),
  ...(themeStore.isDark ? [oneDark] : []),
]);

const jsonExtensions = computed(() => [
  json(),
  ...(themeStore.isDark ? [oneDark] : []),
]);

const loadWorker = async () => {
  loading.value = true;
  try {
    const data = await runtime.getWorker(workerId.value);
    if (data) {
      worker.value = data;
      content.value = data.content;
      workerRoute.value = data.route || "";
      cleanTime.value = data.runtime_clean_time || "";
      envVars.value = Object.entries(data.env || {}).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      // Always keep one empty row for new env var
      ensureEmptyEnvRow();
    } else {
      toast.error("Worker not found");
      router.push("/dashboard/js-runtime");
    }
  } catch (e: any) {
    toast.error(e.message || "Failed to load worker");
  } finally {
    loading.value = false;
  }
};

const ensureEmptyEnvRow = () => {
  if (
    envVars.value.length === 0 ||
    envVars.value[envVars.value.length - 1].key !== "" ||
    envVars.value[envVars.value.length - 1].value !== ""
  ) {
    envVars.value.push({ key: "", value: "" });
  }
};

watch(
  envVars,
  () => {
    ensureEmptyEnvRow();
  },
  { deep: true },
);

onMounted(() => {
  loadWorker();
});

const handleSaveContent = async () => {
  if (!worker.value) return;
  saveLoading.value = true;
  try {
    await runtime.updateWorker(worker.value.id, { content: content.value });
    toast.success(t("dashboard.jsRuntime.updateSuccess"));
    worker.value.content = content.value;
  } catch (e: any) {
    toast.error(e.message || "Save failed");
  } finally {
    saveLoading.value = false;
  }
};

const handleRun = async (runType: "call" | "cron") => {
  if (!worker.value) return;
  runLoading.value = true;
  runResult.value = null;
  try {
    let paramsObj = {};
    let envObj = {};
    try {
      paramsObj = JSON.parse(runParams.value);
    } catch {
      toast.error("Invalid Params JSON");
      return;
    }
    try {
      envObj = JSON.parse(runEnv.value);
    } catch {
      toast.error("Invalid Env JSON");
      return;
    }

    const result = await runtime.runWorker(
      worker.value.id,
      runType,
      paramsObj,
      envObj,
    );
    runResult.value = result;
  } catch (e: any) {
    runResult.value = { error: e.message || "Run failed" };
  } finally {
    runLoading.value = false;
  }
};

const handleSaveSettings = async () => {
  if (!worker.value) return;
  const envObj: Record<string, string> = {};
  envVars.value.forEach((item) => {
    if (item.key.trim()) {
      envObj[item.key.trim()] = item.value;
    }
  });

  saveLoading.value = true;
  try {
    await runtime.updateWorker(worker.value.id, {
      route: workerRoute.value,
      runtime_clean_time: cleanTime.value,
      env: envObj,
    });
    toast.success(t("dashboard.jsRuntime.updateSuccess"));
    await loadWorker();
  } catch (e: any) {
    toast.error(e.message || "Update failed");
  } finally {
    saveLoading.value = false;
  }
};

const formatTime = (ts: number | null) => {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
};
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-100px)] space-y-4">
    <div class="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        @click="router.push('/dashboard/js-runtime')"
      >
        <ChevronLeft class="h-5 w-5" />
      </Button>
      <div>
        <h1 class="text-2xl font-semibold flex items-center gap-2">
          {{ worker?.name || "Loading..." }}
          <span v-if="loading" class="inline-block animate-spin"
            ><Loader2 class="h-4 w-4"
          /></span>
        </h1>
        <p class="text-muted-foreground font-mono text-xs">{{ workerId }}</p>
      </div>
    </div>

    <Tabs v-model="activeTab" class="flex-1 flex flex-col min-h-0">
      <TabsList class="w-fit">
        <TabsTrigger value="overview">{{
          t("dashboard.jsRuntime.tabs.overview")
        }}</TabsTrigger>
        <TabsTrigger value="content">{{
          t("dashboard.jsRuntime.tabs.content")
        }}</TabsTrigger>
        <TabsTrigger value="logs">{{
          t("dashboard.jsRuntime.tabs.logs")
        }}</TabsTrigger>
        <TabsTrigger value="settings">{{
          t("dashboard.jsRuntime.tabs.settings")
        }}</TabsTrigger>
      </TabsList>

      <div class="flex-1 mt-4 min-h-0 overflow-auto">
        <TabsContent value="overview" class="m-0">
          <Card>
            <CardHeader>
              <CardTitle>{{
                t("dashboard.jsRuntime.tabs.overview")
              }}</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                  <p class="text-sm font-medium text-muted-foreground">
                    {{ t("dashboard.jsRuntime.overview.name") }}
                  </p>
                  <p>{{ worker?.name }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-sm font-medium text-muted-foreground">
                    {{ t("dashboard.jsRuntime.overview.id") }}
                  </p>
                  <p class="font-mono">{{ worker?.id }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-sm font-medium text-muted-foreground">
                    {{ t("dashboard.jsRuntime.overview.createdAt") }}
                  </p>
                  <p>{{ formatTime(worker?.created_at || null) }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-sm font-medium text-muted-foreground">
                    {{ t("dashboard.jsRuntime.overview.updatedAt") }}
                  </p>
                  <p>{{ formatTime(worker?.updated_at || null) }}</p>
                </div>
                <div class="space-y-1 col-span-2">
                  <p class="text-sm font-medium text-muted-foreground">
                    {{ t("dashboard.jsRuntime.overview.route") }}
                  </p>
                  <p class="text-emerald-500 font-mono">
                    {{ worker?.route || t("common.none") }}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" class="m-0 h-full flex flex-col min-h-0">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full min-h-0">
            <!-- Left: Editor -->
            <div
              class="flex flex-col min-h-0 border rounded-lg overflow-hidden bg-card"
            >
              <div
                class="p-2 border-b bg-muted/30 flex items-center justify-between"
              >
                <span class="text-sm font-medium px-2">{{
                  t("dashboard.jsRuntime.editor.placeholder")
                }}</span>
                <Button
                  size="sm"
                  variant="outline"
                  @click="handleSaveContent"
                  :disabled="saveLoading"
                >
                  <Loader2
                    v-if="saveLoading"
                    class="mr-2 h-3 w-3 animate-spin"
                  />
                  <Save class="mr-2 h-3 w-3" />
                  {{ t("dashboard.jsRuntime.editor.save") }}
                </Button>
              </div>
              <div class="flex-1 min-h-0 overflow-hidden">
                <Codemirror
                  v-model="content"
                  :extensions="extensions"
                  class="h-full text-[13px]"
                  :style="{ height: '100%' }"
                />
              </div>
            </div>

            <!-- Right: Controls & Result -->
            <div class="flex flex-col gap-4 min-h-0">
              <div class="p-4 border rounded-lg bg-card space-y-4">
                <div class="flex items-center gap-2">
                  <Button
                    size="sm"
                    @click="handleRun('call')"
                    :disabled="runLoading"
                  >
                    <Play class="mr-2 h-3 w-3" />
                    {{ t("dashboard.jsRuntime.editor.runCall") }}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    @click="handleRun('cron')"
                    :disabled="runLoading"
                  >
                    <Clock class="mr-2 h-3 w-3" />
                    {{ t("dashboard.jsRuntime.editor.runCron") }}
                  </Button>
                  <Button size="sm" variant="outline" v-if="worker?.route">
                    <Eye class="mr-2 h-3 w-3" />
                    {{ t("dashboard.jsRuntime.editor.preview") }}
                  </Button>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <Label class="text-xs">{{
                      t("dashboard.jsRuntime.editor.params")
                    }}</Label>
                    <div class="rounded-md border overflow-hidden h-32">
                      <Codemirror
                        v-model="runParams"
                        :extensions="jsonExtensions"
                        class="h-full text-[12px]"
                        :style="{ height: '100%' }"
                      />
                    </div>
                  </div>
                  <div class="space-y-2">
                    <Label class="text-xs">{{
                      t("dashboard.jsRuntime.editor.env")
                    }}</Label>
                    <div class="rounded-md border overflow-hidden h-32">
                      <Codemirror
                        v-model="runEnv"
                        :extensions="jsonExtensions"
                        class="h-full text-[12px]"
                        :style="{ height: '100%' }"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div
                class="flex-1 min-h-0 border rounded-lg overflow-hidden flex flex-col bg-card"
              >
                <div class="p-2 border-b bg-muted/30">
                  <span class="text-sm font-medium px-2">{{
                    t("dashboard.jsRuntime.editor.result")
                  }}</span>
                </div>
                <div class="flex-1 min-h-0 overflow-hidden relative">
                  <div
                    v-if="runLoading"
                    class="absolute inset-0 z-10 bg-background/40 backdrop-blur-[1px] flex items-center justify-center"
                  >
                    <Loader2
                      class="h-8 w-8 animate-spin text-muted-foreground"
                    />
                  </div>
                  <Codemirror
                    :model-value="
                      runResult ? JSON.stringify(runResult, null, 2) : ''
                    "
                    :extensions="jsonExtensions"
                    class="h-full text-[12px]"
                    :style="{ height: '100%' }"
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" class="m-0">
          <Card>
            <CardContent class="p-6 text-center text-muted-foreground">
              {{ t("dashboard.workInProcess") }}
              <p class="text-sm mt-2">(与 /cron-history 类似)</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" class="m-0">
          <div class="max-w-3xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{{
                  t("dashboard.jsRuntime.settings.envVars")
                }}</CardTitle>
              </CardHeader>
              <CardContent class="space-y-4">
                <div
                  v-for="(item, index) in envVars"
                  :key="index"
                  class="flex gap-4 items-center"
                >
                  <Input
                    v-model="item.key"
                    :placeholder="t('dashboard.jsRuntime.settings.key')"
                    class="flex-1"
                  />
                  <Input
                    v-model="item.value"
                    :placeholder="t('dashboard.jsRuntime.settings.value')"
                    class="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 text-destructive"
                    @click="envVars.splice(index, 1)"
                    v-if="index < envVars.length - 1"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                  <div class="w-8" v-else></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{{
                  t("dashboard.jsRuntime.settings.route")
                }}</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="flex gap-4 items-center">
                  <Input
                    v-model="workerRoute"
                    :placeholder="t('dashboard.jsRuntime.settings.route')"
                    class="flex-1 font-mono"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{{
                  t("dashboard.jsRuntime.settings.cleanTime")
                }}</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="flex gap-4 items-center">
                  <Input
                    v-model="cleanTime"
                    :placeholder="t('dashboard.jsRuntime.settings.cleanTime')"
                    class="flex-1 font-mono"
                  />
                </div>
              </CardContent>
            </Card>

            <div class="flex justify-end">
              <Button @click="handleSaveSettings" :disabled="saveLoading">
                <Loader2 v-if="saveLoading" class="mr-2 h-4 w-4 animate-spin" />
                {{ t("dashboard.jsRuntime.settings.confirm") }}
              </Button>
            </div>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  </div>
</template>
