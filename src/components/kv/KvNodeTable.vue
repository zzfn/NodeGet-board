<script setup lang="ts">
import { ref } from "vue";
import { toast } from "vue-sonner";
import { Pencil, Trash2 } from "lucide-vue-next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import NodeMetadataForm from "@/components/node/NodeMetadataForm.vue";
import type { NodeItem, NodeMetadata } from "@/types/node";
import { REGIONS } from "@/data/regions";

function getRegionLabel(code: string) {
  const r = REGIONS.find((r) => r.code === code);
  return r ? `${r.code} — ${r.name}` : code;
}

const nodes = ref<NodeItem[]>([
  {
    id: "1",
    name: "HK-01",
    tags: ["CN2", "BGP", "高速"],
    price: 29.9,
    priceUnit: "¥",
    priceCycle: 30,
    region: "HK",
    hidden: false,
  },
  {
    id: "2",
    name: "LA-02",
    tags: ["IPLC", "直连", "4K"],
    price: 4.99,
    priceUnit: "$",
    priceCycle: 30,
    region: "US",
    hidden: false,
  },
  {
    id: "3",
    name: "JP-01",
    tags: ["软银", "NTT", "低延迟"],
    price: 89,
    priceUnit: "¥",
    priceCycle: 90,
    region: "JP",
    hidden: true,
  },
  {
    id: "4",
    name: "SG-03",
    tags: ["BGP", "企业级"],
    price: 199,
    priceUnit: "¥",
    priceCycle: 365,
    region: "SG",
    hidden: false,
  },
  {
    id: "5",
    name: "US-NY-01",
    tags: ["CN2", "企业级", "premium"],
    price: 9.99,
    priceUnit: "$",
    priceCycle: 30,
    region: "US",
    hidden: true,
  },
]);

const editDialogOpen = ref(false);
const editingId = ref<string | null>(null);
const editForm = ref<NodeMetadata>({
  name: "",
  tags: [],
  price: 0,
  priceUnit: "",
  priceCycle: 30,
  region: "",
  hidden: false,
});

function handleEdit(node: NodeItem) {
  editingId.value = node.id;
  editForm.value = {
    name: node.name,
    tags: [...node.tags],
    price: node.price,
    priceUnit: node.priceUnit,
    priceCycle: node.priceCycle,
    region: node.region,
    hidden: node.hidden,
  };
  editDialogOpen.value = true;
}

function handleSaveEdit() {
  const index = nodes.value.findIndex((n) => n.id === editingId.value);
  if (index !== -1) {
    nodes.value[index] = { id: editingId.value!, ...editForm.value };
  }
  editDialogOpen.value = false;
  toast.success("保存成功");
}

function handleDelete(node: NodeItem) {
  toast.info(`删除功能开发中（${node.name}）`);
}
</script>

<template>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>名称</TableHead>
        <TableHead>标签</TableHead>
        <TableHead class="text-right">价格</TableHead>
        <TableHead>计费周期（天）</TableHead>
        <TableHead>地区</TableHead>
        <TableHead>可见性</TableHead>
        <TableHead class="text-right">操作</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow v-for="node in nodes" :key="node.id">
        <TableCell class="font-medium">{{ node.name }}</TableCell>
        <TableCell>
          <div class="flex flex-wrap gap-1">
            <Badge v-for="tag in node.tags" :key="tag" variant="secondary">{{
              tag
            }}</Badge>
          </div>
        </TableCell>
        <TableCell class="text-right font-mono"
          >{{ node.priceUnit }}{{ node.price }}</TableCell
        >
        <TableCell>{{ node.priceCycle }}</TableCell>
        <TableCell>{{ getRegionLabel(node.region) }}</TableCell>
        <TableCell>
          <Badge
            v-if="!node.hidden"
            class="bg-green-500/15 text-green-600 hover:bg-green-500/25 border-0"
            >显示</Badge
          >
          <Badge v-else variant="secondary">隐藏</Badge>
        </TableCell>
        <TableCell class="text-right">
          <div class="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              @click="handleEdit(node)"
              ><Pencil class="h-4 w-4"
            /></Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-destructive hover:text-destructive"
              @click="handleDelete(node)"
              ><Trash2 class="h-4 w-4"
            /></Button>
          </div>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>

  <Dialog :open="editDialogOpen" @update:open="editDialogOpen = $event">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>编辑节点</DialogTitle>
      </DialogHeader>
      <NodeMetadataForm v-model="editForm" />
      <DialogFooter>
        <Button variant="outline" @click="editDialogOpen = false">取消</Button>
        <Button @click="handleSaveEdit">保存</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
