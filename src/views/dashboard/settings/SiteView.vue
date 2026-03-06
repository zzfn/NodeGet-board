<!-- TODO: 未实现将 customHeader / customBody 注入到页面 <head> / <body> 的逻辑 -->
<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { toast } from "vue-sonner";
import { usePermissionStore } from "@/stores/permission";
import { useBackendStore } from "@/composables/useBackendStore";
import { wsRpcCall } from "@/composables/useWsRpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const KV_KEY_HEADER = "site_custom_header";
const KV_KEY_BODY = "site_custom_body";

const permissionStore = usePermissionStore();
const { currentBackend } = useBackendStore();

const tokenKey = computed(() => permissionStore.tokenInfo?.token_key);

const status = ref<"idle" | "loading" | "ready" | "error">("idle");
const localHeader = ref("");
const localBody = ref("");
const savingHeader = ref(false);
const savingBody = ref(false);

const load = async () => {
  const url = currentBackend.value?.url;
  const token = currentBackend.value?.token;
  const ns = tokenKey.value;
  if (!url || !token || !ns) return;

  status.value = "loading";
  try {
    const [header, body] = await Promise.all([
      wsRpcCall<string>(url, "kv_get_value", {
        token,
        namespace: ns,
        key: KV_KEY_HEADER,
      }).catch(() => null),
      wsRpcCall<string>(url, "kv_get_value", {
        token,
        namespace: ns,
        key: KV_KEY_BODY,
      }).catch(() => null),
    ]);
    localHeader.value = header ?? "";
    localBody.value = body ?? "";
    status.value = "ready";
  } catch {
    status.value = "error";
  }
};

watch(
  () => permissionStore.status,
  (s) => {
    if (s === "ready") load();
  },
  { immediate: true },
);

async function saveHeader() {
  const url = currentBackend.value?.url;
  const token = currentBackend.value?.token;
  const ns = tokenKey.value;
  if (!url || !token || !ns) return;

  savingHeader.value = true;
  try {
    await wsRpcCall(url, "kv_set_value", {
      token,
      namespace: ns,
      key: KV_KEY_HEADER,
      value: localHeader.value,
    });
    toast.success("保存成功");
  } catch {
    toast.error("保存失败");
  } finally {
    savingHeader.value = false;
  }
}

async function saveBody() {
  const url = currentBackend.value?.url;
  const token = currentBackend.value?.token;
  const ns = tokenKey.value;
  if (!url || !token || !ns) return;

  savingBody.value = true;
  try {
    await wsRpcCall(url, "kv_set_value", {
      token,
      namespace: ns,
      key: KV_KEY_BODY,
      value: localBody.value,
    });
    toast.success("保存成功");
  } catch {
    toast.error("保存失败");
  } finally {
    savingBody.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-bold mb-1">自定义</h1>
      <p class="text-muted-foreground text-sm">
        请确保代码的安全性，避免使用不受信任的内容。
      </p>
    </div>

    <Card class="py-4 gap-3">
      <CardHeader class="px-4">
        <CardTitle class="text-base">自定义 Header</CardTitle>
        <CardDescription> 在页面头部添加自定义内容 </CardDescription>
      </CardHeader>
      <CardContent class="px-4">
        <textarea
          v-model="localHeader"
          :disabled="status === 'loading'"
          class="flex min-h-[96px] w-full rounded-md border bg-transparent px-3 py-2 text-sm font-mono shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50"
          placeholder="<script>...</script>"
        />
      </CardContent>
      <CardFooter class="justify-end px-4">
        <Button
          size="sm"
          :disabled="savingHeader || status === 'loading'"
          @click="saveHeader"
        >
          {{ savingHeader ? "保存中..." : "保存" }}
        </Button>
      </CardFooter>
    </Card>

    <Card class="py-4 gap-3">
      <CardHeader class="px-4">
        <CardTitle class="text-base">自定义 Body</CardTitle>
        <CardDescription> 在页面底部添加自定义内容 </CardDescription>
      </CardHeader>
      <CardContent class="px-4">
        <textarea
          v-model="localBody"
          :disabled="status === 'loading'"
          class="flex min-h-[96px] w-full rounded-md border bg-transparent px-3 py-2 text-sm font-mono shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50"
          placeholder="<script>...</script>"
        />
      </CardContent>
      <CardFooter class="justify-end px-4">
        <Button
          size="sm"
          :disabled="savingBody || status === 'loading'"
          @click="saveBody"
        >
          {{ savingBody ? "保存中..." : "保存" }}
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
