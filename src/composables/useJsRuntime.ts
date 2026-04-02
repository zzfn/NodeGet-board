import { ref } from "vue";
import { useBackendStore } from "@/composables/useBackendStore";
import { getWsConnection } from "@/composables/useWsConnection";
import { mockWorkers, mockRunResult } from "@/mocks/jsRuntimeData";
import type { JsWorker } from "@/types/worker";

export function useJsRuntime() {
  const { currentBackend } = useBackendStore();

  const workers = ref<JsWorker[]>([]);
  const loading = ref(false);

  // Simple mock mode toggle: if url is not valid or special 'Mock' backend
  const isMockMode = () => {
    if (!currentBackend.value?.url) return true;
    if (currentBackend.value.name === "Mock") return true;
    return false;
  };

  const fetchWorkers = async () => {
    if (isMockMode()) {
      loading.value = true;
      await new Promise((r) => setTimeout(r, 500)); // simulate delay
      workers.value = [...mockWorkers];
      loading.value = false;
      return;
    }

    const backend = currentBackend.value;
    if (!backend) return;

    loading.value = true;
    try {
      const result = await getWsConnection(backend.url).call<JsWorker[]>(
        "js_worker_list",
        { token: backend.token },
      );
      workers.value = result || [];
    } catch (e) {
      console.error("Failed to fetch workers", e);
      // Fallback to mock in case of failure in dev
      if (import.meta.env.DEV) {
        workers.value = [...mockWorkers];
      }
    } finally {
      loading.value = false;
    }
  };

  const addWorker = async (name: string, content: string) => {
    if (isMockMode()) {
      const newWorker: JsWorker = {
        id: "worker_" + Math.random().toString(36).slice(2, 9),
        name,
        route: "/" + name.toLowerCase().replace(/\s+/g, "-"),
        content,
        created_at: Date.now(),
        updated_at: Date.now(),
        env: {},
        runtime_clean_time: "1h",
      };
      mockWorkers.push(newWorker);
      workers.value = [...mockWorkers];
      return newWorker;
    }

    const backend = currentBackend.value;
    if (!backend) return;

    return await getWsConnection(backend.url).call<JsWorker>("js_worker_add", {
      token: backend.token,
      name,
      content,
    });
  };

  const deleteWorker = async (id: string) => {
    if (isMockMode()) {
      const idx = mockWorkers.findIndex((w) => w.id === id);
      if (idx !== -1) mockWorkers.splice(idx, 1);
      workers.value = [...mockWorkers];
      return;
    }

    const backend = currentBackend.value;
    if (!backend) return;

    await getWsConnection(backend.url).call("js_worker_delete", {
      token: backend.token,
      id,
    });
  };

  const getWorker = async (id: string) => {
    if (isMockMode()) {
      return mockWorkers.find((w) => w.id === id) || null;
    }

    const backend = currentBackend.value;
    if (!backend) return null;

    return await getWsConnection(backend.url).call<JsWorker>("js_worker_get", {
      token: backend.token,
      id,
    });
  };

  const updateWorker = async (id: string, updates: Partial<JsWorker>) => {
    if (isMockMode()) {
      const idx = workers.value.findIndex((w) => w.id === id);
      const existing = workers.value[idx];
      if (existing) {
        const updated: JsWorker = {
          ...existing,
          ...updates,
          id: existing.id, // 确保 ID 不会被覆盖
          updated_at: Date.now(),
        };

        workers.value[idx] = updated;
        // 同步更新 mockWorkers 以便持久化（内存中）
        const mockIdx = mockWorkers.findIndex((w) => w.id === id);
        if (mockIdx !== -1) {
          mockWorkers.splice(mockIdx, 1, updated);
        }
        return updated;
      }
      return null;
    }

    const backend = currentBackend.value;
    if (!backend) return;

    return await getWsConnection(backend.url).call<JsWorker>(
      "js_worker_update",
      {
        token: backend.token,
        id,
        ...updates,
      },
    );
  };

  const runWorker = async (
    id: string,
    runType: "call" | "cron",
    params: any,
    env: any,
  ) => {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 300));
      return mockRunResult(id, runType, params, env);
    }

    const backend = currentBackend.value;
    if (!backend) return;

    return await getWsConnection(backend.url).call("js_worker_run", {
      token: backend.token,
      id,
      run_type: runType,
      params,
      env,
    });
  };

  return {
    workers,
    loading,
    fetchWorkers,
    addWorker,
    deleteWorker,
    getWorker,
    updateWorker,
    runWorker,
  };
}
