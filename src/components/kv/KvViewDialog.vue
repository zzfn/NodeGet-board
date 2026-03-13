<script setup lang="ts">
import { Mode } from "vanilla-jsoneditor";
import JsonEditorVue from "json-editor-vue";
import "vanilla-jsoneditor/themes/jse-theme-dark.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useThemeStore } from "@/stores/theme";

const props = defineProps<{
  open: boolean;
  kvKey: string;
  loading?: boolean;
  value: unknown;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const themeStore = useThemeStore();
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>查看 Key-Value</DialogTitle>
        <DialogDescription class="font-mono">{{ kvKey }}</DialogDescription>
      </DialogHeader>

      <div v-if="loading" class="text-center py-8 text-muted-foreground">
        加载中...
      </div>
      <JsonEditorVue
        v-else
        :model-value="value"
        :mode="Mode.text"
        :class="themeStore.isDark ? 'jse-theme-dark' : ''"
        :read-only="true"
        :main-menu-bar="false"
        :navigation-bar="false"
        style="height: 280px"
      />
    </DialogContent>
  </Dialog>
</template>
