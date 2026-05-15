<script setup lang="ts">
import { ref, watch } from "vue";
import { Loader2, Plus, Trash2 } from "lucide-vue-next";
import { toast } from "vue-sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useKv } from "@/composables/useKv";
import { useBackendStore } from "@/composables/useBackendStore";
import { getWsConnection } from "@/composables/useWsConnection";
import {
  createDefaultToken,
  DEFAULT_SCOPE,
  serializeTokenPayload,
} from "@/components/token/scopeCodec";
import { generatePassword } from "@/lib/password";
import type { PermissionEntry } from "@/components/token/type";
import type { ThemeToken } from "@/types/theme";

type TokenPreset = ThemeToken;

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const kv = useKv();
const backendStore = useBackendStore();

const KV_NAMESPACE = "global";
const KV_KEY = "theme_token";

const BASE_PERMISSIONS: PermissionEntry[] = [
  { static_monitoring: { read: "cpu" } },
  { static_monitoring: { read: "system" } },
  { static_monitoring: { read: "gpu" } },
  { dynamic_monitoring_summary: "read" },
  { node_get: "list_all_agent_uuid" },
  { kv: { read: "metadata_*" } },
];

const FULL_PERMISSIONS: PermissionEntry[] = [
  ...BASE_PERMISSIONS,
  { task: { read: "ping" } },
  { task: { read: "tcp_ping" } },
];

const presets = ref<TokenPreset[]>([]);
const saving = ref(false);
const loading = ref(false);

const buildTokenPayload = (username: string, permissions: PermissionEntry[]) =>
  serializeTokenPayload({
    ...createDefaultToken(),
    username,
    password: generatePassword(16),
    token_limit: [
      {
        scopes: [...DEFAULT_SCOPE],
        permissions: permissions.map((p) => ({ ...p })),
      },
    ],
  });

const createTokenOnBackend = async (
  url: string,
  fatherToken: string,
  username: string,
  permissions: PermissionEntry[],
): Promise<string> => {
  const conn = getWsConnection(url);

  const listResult = await conn.call<{
    tokens?: Array<{ token_key: string; username: string | null }>;
  }>("token_list_all_tokens", { token: fatherToken });
  const existing = listResult.tokens?.find((t) => t.username === username);
  if (existing) {
    await conn.call("token_delete", {
      token: fatherToken,
      target_token: existing.token_key,
    });
  }

  const result = await conn.call<{
    key?: string;
    secret?: string;
    error?: { message?: string };
  }>("token_create", {
    father_token: fatherToken,
    token_creation: buildTokenPayload(username, permissions),
  });
  if (result.key && result.secret) return `${result.key}:${result.secret}`;
  throw new Error(result.error?.message ?? "服务端未返回 key/secret");
};

const initDefaultPresets = async (): Promise<TokenPreset[]> => {
  const backend = backendStore.currentBackend.value;
  if (!backend) return [];

  const settle = async (username: string, permissions: PermissionEntry[]) => {
    try {
      return await createTokenOnBackend(
        backend.url,
        backend.token,
        username,
        permissions,
      );
    } catch (e: unknown) {
      toast.warning(
        `${username}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return "";
    }
  };

  const [t1, t2] = await Promise.all([
    settle("visitor_monitor_only", BASE_PERMISSIONS),
    settle("visitor_monitor_with_ping", FULL_PERMISSIONS),
  ]);

  return [
    { name: "本机 纯监控", backend_url: backend.url, token: t1 },
    { name: "本机 监控+ping", backend_url: backend.url, token: t2 },
  ];
};

const loadPresets = async () => {
  loading.value = true;
  try {
    kv.namespace.value = KV_NAMESPACE;
    const raw = await kv.getValue(KV_KEY);
    const saved: TokenPreset[] = Array.isArray(raw)
      ? (raw as TokenPreset[])
      : [];
    if (saved.length === 0 && backendStore.currentBackend.value) {
      const initialized = await initDefaultPresets();
      kv.namespace.value = KV_NAMESPACE;
      await kv.setValue(KV_KEY, initialized);
      presets.value = initialized;
      return;
    }
    presets.value = saved;
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "加载预设失败");
    presets.value = [];
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.open,
  (val) => {
    if (val) loadPresets();
  },
);

const addRow = () => {
  presets.value.push({ name: "", backend_url: "", token: "" });
};

const removeRow = (index: number) => {
  presets.value.splice(index, 1);
};

const handleSave = async () => {
  const tokens = presets.value.map((p) => p.token).filter(Boolean);
  if (new Set(tokens).size !== tokens.length) {
    toast.error("存在重复的 Token，请检查后重试");
    return;
  }
  saving.value = true;
  try {
    kv.namespace.value = KV_NAMESPACE;
    await kv.setValue(KV_KEY, presets.value);
    toast.success("Token 预设已保存");
    emit("update:open", false);
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "保存失败");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Token 预设管理</DialogTitle>
      </DialogHeader>

      <div class="space-y-3 py-2">
        <div v-if="loading" class="flex items-center justify-center py-6">
          <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
        </div>

        <template v-else>
          <div
            v-if="presets.length"
            class="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-1"
          >
            <span>名称</span>
            <span>后端 URL</span>
            <span>Token</span>
            <span />
          </div>

          <div
            v-for="(preset, i) in presets"
            :key="i"
            class="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center"
          >
            <Input v-model="preset.name" placeholder="名称" />
            <Input v-model="preset.backend_url" placeholder="https://..." />
            <Input v-model="preset.token" placeholder="token" />
            <Button
              variant="ghost"
              size="icon"
              class="shrink-0"
              @click="removeRow(i)"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>

          <div
            v-if="!presets.length"
            class="text-center text-muted-foreground text-sm py-4"
          >
            暂无预设，点击「新增」添加
          </div>

          <Button variant="outline" size="sm" class="w-full" @click="addRow">
            <Plus class="h-4 w-4 mr-1" />
            新增
          </Button>
        </template>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">
          取消
        </Button>
        <Button :disabled="saving" @click="handleSave">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin mr-1" />
          保存
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
