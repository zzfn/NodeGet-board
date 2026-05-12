import { ref, computed } from "vue";
import { useBackendStore } from "@/composables/useBackendStore";
import { getWsConnection } from "@/composables/useWsConnection";

export type BucketFile = {
  path: string;
  size: number;
  mtime: number;
};

export function useStaticBucketFile(
  backend = useBackendStore().currentBackend,
) {
  const backendUrl = computed(() => backend.value?.url ?? "");
  const backendToken = computed(() => backend.value?.token ?? "");

  const files = ref<BucketFile[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const rpc = <T>(method: string, params: unknown): Promise<T> =>
    getWsConnection(backendUrl.value).call<T>(method, params);

  const fetchList = async (bucketName: string): Promise<BucketFile[]> => {
    if (!backendUrl.value) return [];
    loading.value = true;
    error.value = null;
    try {
      const list = await rpc<BucketFile[]>("static-bucket-file_list", {
        token: backendToken.value,
        name: bucketName,
      });
      files.value = Array.isArray(list) ? list : [];
      return files.value;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
      files.value = [];
      return [];
    } finally {
      loading.value = false;
    }
  };

  const uploadFile = async (
    bucketName: string,
    path: string,
    base64: string,
  ): Promise<void> => {
    await rpc("static-bucket-file_upload", {
      token: backendToken.value,
      name: bucketName,
      path,
      base64,
    });
  };

  const readFile = async (
    bucketName: string,
    path: string,
  ): Promise<string> => {
    return rpc<string>("static-bucket-file_read", {
      token: backendToken.value,
      name: bucketName,
      path,
    });
  };

  const deleteFile = async (
    bucketName: string,
    path: string,
  ): Promise<void> => {
    await rpc("static-bucket-file_delete", {
      token: backendToken.value,
      name: bucketName,
      path,
    });
    files.value = files.value.filter((f) => f.path !== path);
  };

  const renameFile = async (
    bucketName: string,
    from: string,
    to: string,
  ): Promise<void> => {
    await rpc("static-bucket-file_rename", {
      token: backendToken.value,
      name: bucketName,
      from,
      to,
    });
    files.value = files.value.map((f) =>
      f.path === from ? { ...f, path: to } : f,
    );
  };

  const clearFiles = () => {
    files.value = [];
  };

  return {
    files,
    loading,
    error,
    fetchList,
    uploadFile,
    readFile,
    deleteFile,
    renameFile,
    clearFiles,
  };
}
