<script setup lang="ts">
import { ref, watch } from "vue";
import { Loader2 } from "lucide-vue-next";
import { Mode } from "vanilla-jsoneditor";
import JsonEditorVue from "json-editor-vue";
import "vanilla-jsoneditor/themes/jse-theme-dark.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useThemeStore } from "@/stores/theme";

const props = defineProps<{
  open: boolean;
  loading?: boolean;
  editKey?: string;
  editValue?: unknown;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  save: [key: string, value: unknown];
}>();

const themeStore = useThemeStore();

const key = ref("");
const editorValue = ref<unknown>(undefined);

watch(
  () => [props.open, props.editValue] as const,
  ([open, val]) => {
    if (open) {
      key.value = props.editKey ?? "";
      editorValue.value =
        val !== undefined ? JSON.stringify(val, null, 2) : "{}";
    }
  },
);

const isEditMode = () => props.editKey !== undefined;

const handleSave = () => {
  let parsed: unknown;
  try {
    parsed =
      typeof editorValue.value === "string"
        ? JSON.parse(editorValue.value)
        : editorValue.value;
  } catch {
    return;
  }
  emit("save", key.value.trim(), parsed);
};

const close = () => emit("update:open", false);
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{
          isEditMode() ? "编辑 Key-Value" : "新增 Key-Value"
        }}</DialogTitle>
        <DialogDescription>Value 必须为合法的 JSON 格式</DialogDescription>
      </DialogHeader>

      <div
        v-if="loading"
        class="flex items-center justify-center py-8 text-muted-foreground gap-2"
      >
        <Loader2 class="h-5 w-5 animate-spin" />
        <span>加载中...</span>
      </div>

      <div v-else class="space-y-4">
        <div class="space-y-2">
          <Label for="kv-key">Key</Label>
          <Input
            id="kv-key"
            v-model="key"
            placeholder="输入 key"
            :readonly="isEditMode()"
            :class="isEditMode() ? 'opacity-60 cursor-not-allowed' : ''"
          />
        </div>

        <div class="space-y-2">
          <Label>Value</Label>
          <JsonEditorVue
            v-model="editorValue"
            :mode="Mode.text"
            :class="themeStore.isDark ? 'jse-theme-dark' : ''"
            :main-menu-bar="false"
            :navigation-bar="false"
            style="height: 240px"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="close">取消</Button>
        <Button :disabled="loading" @click="handleSave">保存</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
