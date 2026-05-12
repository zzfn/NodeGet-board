<script setup lang="ts">
import {
  Plus,
  Trash2,
  RefreshCw,
  Upload,
  Download,
  Loader2,
  FolderOpen,
  FolderSync,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PopConfirm } from "@/components/ui/pop-confirm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StaticBucket } from "@/composables/useStaticBucket";

const props = defineProps<{
  buckets: StaticBucket[];
  loading?: boolean;
  deletingName?: string | null;
}>();

const emit = defineEmits<{
  select: [name: string];
  create: [];
  uploadDir: [];
  reupload: [name: string];
  downloadZip: [name: string];
  delete: [name: string];
  refresh: [];
  toggleHttpRoot: [bucket: StaticBucket];
}>();
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 justify-end">
      <Button
        variant="outline"
        size="sm"
        :disabled="loading"
        @click="emit('refresh')"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
      </Button>
      <Button variant="outline" size="sm" @click="emit('uploadDir')">
        <Upload class="h-4 w-4 mr-1" />
        上传本地目录
      </Button>
      <Button size="sm" @click="emit('create')">
        <Plus class="h-4 w-4 mr-1" />
        创建空白目录
      </Button>
    </div>

    <div v-if="loading" class="text-center py-10 text-muted-foreground">
      加载中...
    </div>
    <div
      v-else-if="buckets.length === 0"
      class="text-center py-10 text-muted-foreground"
    >
      暂无 Bucket
    </div>
    <Table v-else>
      <TableHeader>
        <TableRow>
          <TableHead>名称</TableHead>
          <TableHead class="w-36">root 路由</TableHead>
          <TableHead class="w-32 text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="bucket in buckets" :key="bucket.name">
          <TableCell>
            <button
              class="flex items-center gap-1.5 font-mono text-sm text-primary text-left cursor-pointer group"
              @click="emit('select', bucket.name)"
            >
              <FolderOpen class="h-4 w-4 shrink-0" />
              <span class="group-hover:underline underline-offset-2">{{
                bucket.name
              }}</span>
            </button>
          </TableCell>
          <TableCell>
            <div class="flex items-center gap-2">
              <Switch
                :model-value="bucket.is_http_root"
                @update:model-value="emit('toggleHttpRoot', bucket)"
              />
              <span
                v-if="bucket.is_http_root"
                class="text-xs text-muted-foreground"
                >启用</span
              >
            </div>
          </TableCell>
          <TableCell class="text-right">
            <div class="flex justify-end gap-1">
              <!-- 删除 -->
              <PopConfirm
                v-if="deletingName !== bucket.name"
                :description="`确认删除 Bucket「${bucket.name}」？`"
                confirm-text="删除"
                @confirm="emit('delete', bucket.name)"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-7 w-7 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </Button>
              </PopConfirm>
              <Button
                v-else
                variant="ghost"
                size="sm"
                disabled
                class="h-7 w-7 p-0 text-destructive"
              >
                <Loader2 class="h-3.5 w-3.5 animate-spin" />
              </Button>
              <!-- 重新上传 -->
              <Button
                variant="ghost"
                size="sm"
                class="h-7 w-7 p-0"
                title="重新上传"
                @click="emit('reupload', bucket.name)"
              >
                <FolderSync class="h-3.5 w-3.5" />
              </Button>
              <!-- 下载压缩包 -->
              <Button
                variant="ghost"
                size="sm"
                class="h-7 w-7 p-0"
                title="下载为压缩包"
                @click="emit('downloadZip', bucket.name)"
              >
                <Download class="h-3.5 w-3.5" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
