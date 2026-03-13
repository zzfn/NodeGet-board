import { ref, computed } from "vue";
import { useBackendStore } from "@/composables/useBackendStore";
import { getWsConnection } from "@/composables/useWsConnection";

export type KvEntry = { key: string; value: unknown };

export function useKv() {
  const { currentBackend } = useBackendStore();
  const backendUrl = computed(() => currentBackend.value?.url ?? "");
  const backendToken = computed(() => currentBackend.value?.token ?? "");

  const namespace = ref("");
  const namespaces = ref<string[]>([]);
  const namespacesLoading = ref(false);
  const entries = ref<KvEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const rpc = <T>(method: string, params: unknown): Promise<T> =>
    getWsConnection(backendUrl.value).call<T>(method, params);

  // TODO: replace with kv_list_namespaces RPC once the backend supports it.
  // For now, derive the single namespace from the token key (format: "token_key:token_secret").
  const fetchNamespaces = async () => {
    if (!backendUrl.value) return;
    namespacesLoading.value = true;
    const tokenKey = backendToken.value.split(":")[0]?.trim();
    namespaces.value = tokenKey ? [tokenKey] : [];
    namespacesLoading.value = false;
  };

  const fetchKeys = async () => {
    if (!namespace.value) return;
    loading.value = true;
    error.value = null;
    try {
      const keys = await rpc<string[]>("kv_get_all_keys", {
        token: backendToken.value,
        namespace: namespace.value,
      });
      const keyList = Array.isArray(keys) ? keys : [];
      // Fetch all values concurrently over the same connection
      const values = await Promise.allSettled(
        keyList.map((key) =>
          rpc<unknown>("kv_get_value", {
            token: backendToken.value,
            namespace: namespace.value,
            key,
          }),
        ),
      );
      entries.value = keyList.map((key, i) => ({
        key,
        value: values[i]?.status === "fulfilled" ? values[i].value : undefined,
      }));
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
      entries.value = [];
    } finally {
      loading.value = false;
    }
  };

  const getValue = async (key: string): Promise<unknown> => {
    const cached = entries.value.find((e) => e.key === key);
    if (cached?.value !== undefined) return cached.value;
    return rpc<unknown>("kv_get_value", {
      token: backendToken.value,
      namespace: namespace.value,
      key,
    });
  };

  const setValue = async (key: string, value: unknown): Promise<void> => {
    try {
      JSON.stringify(value);
    } catch {
      throw new Error("value 必须是可序列化的 JSON");
    }
    await rpc("kv_set_value", {
      token: backendToken.value,
      namespace: namespace.value,
      key,
      value,
    });
    const entry = entries.value.find((e) => e.key === key);
    if (entry) {
      entry.value = value;
    } else {
      entries.value.push({ key, value });
    }
  };

  const deleteKey = async (key: string): Promise<void> => {
    await rpc("kv_delete_key", {
      token: backendToken.value,
      namespace: namespace.value,
      key,
    });
    entries.value = entries.value.filter((e) => e.key !== key);
  };

  const createNamespace = async (ns: string): Promise<void> => {
    await rpc("kv_create", { token: backendToken.value, namespace: ns });
  };

  // Initialize by fetching namespace list
  const init = async () => {
    if (!backendUrl.value) return;
    await fetchNamespaces();
  };

  return {
    namespace,
    namespaces,
    namespacesLoading,
    entries,
    loading,
    error,
    init,
    fetchNamespaces,
    fetchKeys,
    getValue,
    setValue,
    deleteKey,
    createNamespace,
  };
}
