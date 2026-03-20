import { computed, onMounted, ref, watch } from "vue";
import { useBackendStore } from "@/composables/useBackendStore";
import { wsRpcCall } from "@/composables/useWsRpc";
import { toast } from "vue-sonner";
import { type UuidList } from "./type";

export type errorResponse = {
  error: {
    code: 101 | 102 | 103 | 104 | 105 | 106 | 107 | 108 | 999;
    message: String;
  };
};

export const useAgentHook = () => {
  const { currentBackend } = useBackendStore();
  const backendUrl = computed(() => currentBackend.value?.url ?? "");

  //   获取agent-uuid列表
  const getAgentList = async (): Promise<string[]> => {
    const url = backendUrl.value.trim();
    const token = currentBackend.value?.token?.trim() || "";
    if (!url || !token) return [];
    try {
      const result = await wsRpcCall<{ uuids?: string[] }>(
        url,
        "nodeget-server_list_all_agent_uuid",
        {
          token,
        },
      );
      if (Array.isArray(result.uuids) && result.uuids.length > 0) {
        return result.uuids;
      }
      toast.error("获取agent-uuid列表失败");
      return [];
    } catch (error) {
      console.error(error);
      toast.error("获取agent-uuid列表失败");
      return [];
    }
  };

  return { getAgentList };
};
