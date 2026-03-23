<script setup lang="ts">
import { ref } from "vue";
import { toast } from "vue-sonner";
import { type token } from "../type";
import { Copy, KeyRound } from "lucide-vue-next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BaseInfoFrom from "../components/baseInfoFrom.vue";
import tokenLimitFrom from "../components/tokenLimitFrom.vue";
import PrevireToken from "../components/previewTokenJson.vue";
import { useCreatTokenHook } from "../create-token/useCreateToken";
import { createDefaultToken } from "../scopeCodec";

const createToken = useCreatTokenHook();

const tokenFromData = ref<token>(createDefaultToken());
const createLoading = ref(false);
const successDialogOpen = ref(false);
const createdTokenInfo = ref({
  key: "",
  secret: "",
});

const copyText = async (value: string, successMessage: string) => {
  if (!value) return;

  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch (error) {
    toast.error("复制失败，请手动复制保存");
  }
};

// 创建token
const handleCreateToken = () => {
  createLoading.value = true;
  createToken
    .createToken(tokenFromData.value)
    .then((result) => {
      if (result.key && result.secret) {
        createdTokenInfo.value = {
          key: result.key,
          secret: result.secret,
        };
        successDialogOpen.value = true;
      }
    })
    .finally(() => {
      createLoading.value = false;
    });
  console.log(tokenFromData.value);
};
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <KeyRound class="h-5 w-5" />
        创建token
      </CardTitle>
    </CardHeader>

    <CardContent class="space-y-6 grid gap-6 xl:grid-cols-2">
      <div class="space-y-4">
        <BaseInfoFrom v-model:token="tokenFromData" />
        <tokenLimitFrom v-model:token="tokenFromData" />
        <Button
          @click="handleCreateToken"
          class="w-full"
          :disabled="createLoading"
        >
          <div v-if="createLoading">创建中...</div>
          <div v-else>创建token</div>
        </Button>
      </div>
      <!-- 预览区 -->
      <div>
        <PrevireToken :token="tokenFromData" />
      </div>
    </CardContent>
  </Card>

  <Dialog v-model:open="successDialogOpen">
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Token 创建成功</DialogTitle>
        <DialogDescription>
          新创建的 Token 只会显示这一次，请立即复制并妥善保存。
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div class="space-y-2">
          <Label>Token Key</Label>
          <div class="flex items-center gap-2">
            <Input :model-value="createdTokenInfo.key" readonly />
            <Button
              type="button"
              variant="outline"
              size="icon"
              @click="copyText(createdTokenInfo.key, 'Token Key 已复制')"
            >
              <Copy class="h-4 w-4" />
              <span class="sr-only">复制 Token Key</span>
            </Button>
          </div>
        </div>

        <div class="space-y-2">
          <Label>Token Secret</Label>
          <div class="flex items-center gap-2">
            <Input :model-value="createdTokenInfo.secret" readonly />
            <Button
              type="button"
              variant="outline"
              size="icon"
              @click="copyText(createdTokenInfo.secret, 'Token Secret 已复制')"
            >
              <Copy class="h-4 w-4" />
              <span class="sr-only">复制 Token Secret</span>
            </Button>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          class="w-full"
          @click="
            copyText(
              `${createdTokenInfo.key}:${createdTokenInfo.secret}`,
              '完整 Token 已复制',
            )
          "
        >
          复制完整 Token
        </Button>
      </div>

      <DialogFooter>
        <Button type="button" @click="successDialogOpen = false">
          我已保存
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
