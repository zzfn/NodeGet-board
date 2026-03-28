<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { Loader2, Pencil, Trash2, Menu } from "lucide-vue-next";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PopConfirm } from "@/components/ui/pop-confirm";
import type { Script } from "@/composables/useScripts";

const tables = ref<Script[]>([]);

const props = defineProps<{
  scripts: Script[];
  loading?: boolean;
  deletingNames: string[];
}>();

const emit = defineEmits<{
  edit: [script: Script];
  delete: [name: string];
  updateOrder: [script: Script];
}>();

const formatTime = (ts: number) => {
  return new Date(ts).toLocaleString();
};

const isDeleting = (name: string) => props.deletingNames.includes(name);

watch(
  () => props.scripts,
  () => {
    tables.value = props.scripts.sort((a, b) => a.order - b.order);
  },
);

const draggingIndex = ref<number | null>(null);
let startY = 0;
let isTouch = false;

const startDrag = (
  event: MouseEvent | TouchEvent,
  index: number,
  touch = false,
) => {
  draggingIndex.value = index;
  isTouch = touch;

  startY = touch
    ? event instanceof TouchEvent
      ? (event.touches[0]?.clientY ?? 0)
      : 0
    : event instanceof MouseEvent
      ? event.clientY
      : 0;

  const onMove = (e: MouseEvent | TouchEvent) => {
    const clientY = isTouch
      ? e instanceof TouchEvent
        ? (e.touches[0]?.clientY ?? 0)
        : 0
      : e instanceof MouseEvent
        ? e.clientY
        : 0;

    if (draggingIndex.value === null) return;

    const deltaY = clientY - startY;

    if (Math.abs(deltaY) > 40) {
      const targetIndex =
        deltaY > 0 ? draggingIndex.value + 1 : draggingIndex.value - 1;
      if (targetIndex >= 0 && targetIndex < tables.value.length) {
        const temp = tables.value[targetIndex]!;
        tables.value[targetIndex] = tables.value[draggingIndex.value]!;
        tables.value[draggingIndex.value] = temp;
        draggingIndex.value = targetIndex;
        startY = clientY;
      }
    }
  };

  const onEnd = () => {
    updateOrderIfChanged();
    draggingIndex.value = null;
    window.removeEventListener(isTouch ? "touchmove" : "mousemove", onMove);
    window.removeEventListener(isTouch ? "touchend" : "mouseup", onEnd);
  };

  window.addEventListener(isTouch ? "touchmove" : "mousemove", onMove);
  window.addEventListener(isTouch ? "touchend" : "mouseup", onEnd);
};

const updateOrderIfChanged = () => {
  if (!props.scripts || !tables.value) return;

  // 先对 props.scripts 按 order 排序
  const tmpScripts = [...props.scripts].sort((a, b) => a.order - b.order);

  tables.value.forEach((script, index) => {
    const originalIndex = tmpScripts.findIndex((s) => s.name === script.name);
    if (originalIndex !== index) {
      let newOrder: number;

      // 拖到最前
      if (index === 0) {
        const second = tables.value[1];
        newOrder =
          second?.order !== undefined ? second.order - 1 : script.order - 1;
      }
      // 拖到最后
      else if (index === tables.value.length - 1) {
        const penultimate = tables.value[tables.value.length - 2];
        newOrder =
          penultimate?.order !== undefined
            ? penultimate.order + 1
            : script.order + 1;
      }
      // 拖到中间
      else {
        const prev = tables.value[index - 1];
        const next = tables.value[index + 1];
        const prevOrder = prev?.order ?? script.order - 1;
        const nextOrder = next?.order ?? script.order + 1;
        newOrder = (prevOrder + nextOrder) / 2;
      }

      // 如果 order 发生变化，触发 emit
      if (newOrder !== script.order) {
        script.order = newOrder;
        emit("updateOrder", script);
      }
    }
  });
};
</script>

<template>
  <div class="relative w-full">
    <div
      v-if="loading && scripts.length"
      class="absolute inset-0 z-10 bg-background/40 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-md"
    >
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="text-center">{{
            $t("dashboard.scripts.order")
          }}</TableHead>
          <TableHead class="text-center">{{
            $t("dashboard.scripts.name")
          }}</TableHead>
          <TableHead class="text-center">{{
            $t("dashboard.scripts.lang")
          }}</TableHead>
          <TableHead class="text-center">{{
            $t("dashboard.scripts.updatedTime")
          }}</TableHead>
          <TableHead>{{ $t("dashboard.scripts.actions") }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="loading && !tables.length">
          <TableCell colspan="7" class="h-32 text-center text-muted-foreground">
            <div class="flex flex-col items-center justify-center space-y-3">
              <Loader2 class="w-6 h-6 animate-spin text-muted-foreground/50" />
              <span class="text-sm font-medium">{{
                $t("common.loading")
              }}</span>
            </div>
          </TableCell>
        </TableRow>
        <TableRow v-else-if="!tables.length">
          <TableCell
            colspan="7"
            class="text-center text-muted-foreground py-12"
          >
            {{ $t("dashboard.cron.empty") }}
          </TableCell>
        </TableRow>
        <TableRow v-for="(script, index) in tables" :key="script.name">
          <TableCell
            class="text-center cursor-move select-none"
            @mousedown="startDrag($event, index)"
            @touchstart.prevent="startDrag($event, index, true)"
          >
            <div class="flex items-center justify-center">
              <Menu class="h-4 w-4 mr-1" />
              <span>{{ index + 1 }}</span>
            </div>
          </TableCell>
          <TableCell class="font-medium text-center">
            {{ script.name }}
          </TableCell>
          <TableCell class="font-medium text-center">
            <Badge variant="secondary">{{ script.lang }}</Badge>
          </TableCell>
          <TableCell class="text-center">{{
            formatTime(script.updated_at)
          }}</TableCell>
          <TableCell>
            <Button
              variant="ghost"
              size="icon"
              @click="emit('edit', script)"
              class="hover:bg-transparent"
            >
              <Pencil class="h-4 w-4" />
            </Button>
            <PopConfirm
              :description="
                $t('dashboard.scripts.deleteConfirm', { name: script.name })
              "
              :loading="isDeleting(script.name)"
              @confirm="emit('delete', script.name)"
            >
              <Button
                size="icon"
                variant="ghost"
                :disabled="isDeleting(script.name)"
                class="h-7 w-7 text-destructive hover:text-destructive"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </Button>
            </PopConfirm>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
