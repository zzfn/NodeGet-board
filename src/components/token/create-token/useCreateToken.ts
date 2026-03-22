import { computed, onMounted, ref, watch } from "vue";
import { useBackendStore } from "@/composables/useBackendStore";
import { wsRpcCall } from "@/composables/useWsRpc";
import { toast } from "vue-sonner";
import { type UuidList, type token } from "../type";
import { buildLimitPayload } from "../scopeCodec";

export type errorResponse = {
  error: {
    code: 101 | 102 | 103 | 104 | 105 | 106 | 107 | 108 | 999;
    message: String;
  };
};

export const useCreatTokenHook = () => {
  const { currentBackend } = useBackendStore();
  const backendUrl = computed(() => currentBackend.value?.url ?? "");

  //   获取agent-uuid列表
  const createToken = async (
    token_creation: token,
  ): Promise<{ key?: string; secret?: string }> => {
    const url = backendUrl.value.trim();
    const token = currentBackend.value?.token?.trim() || "";
    if (!url || !token) return {};
    const normalizedTokenCreation = {
      ...token_creation,
      token_limit: buildLimitPayload(token_creation),
    };
    try {
      const result = await wsRpcCall<{ key?: string; secret?: string }>(
        url,
        "token_create",
        {
          father_token: token,
          token_creation: normalizedTokenCreation,
        },
      );
      if (result.key && result.secret) {
        toast.success("创建Token成功");
        return result;
      }
      toast.error("创建Token失败");
      return {};
    } catch (error) {
      toast.error("创建Token失败");
      return {};
    }
  };

  return { createToken };
};
