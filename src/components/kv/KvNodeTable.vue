<script setup lang="ts">
import { ref, onMounted } from "vue";
import { toast } from "vue-sonner";
import { Pencil, Loader2 } from "lucide-vue-next";
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
import { useKv } from "@/composables/useKv";

const kv = useKv();

function getRegionLabel(code: string) {
  const r = REGIONS.find((r) => r.code === code);
  return r ? `${r.code} — ${r.name}` : code;
}

const nodes = ref<NodeItem[]>([]);
const loading = ref(false);

function parseNode(
  ns: string,
  entries: { key: string; value: unknown }[],
): NodeItem | null {
  const get = (key: string) => entries.find((e) => e.key === key)?.value;
  const unwrap = (v: unknown) => (Array.isArray(v) ? v[0] : v);
  const rawName = get("metadata_name");
  const name = String(unwrap(rawName) ?? "") || ns;
  return {
    id: ns,
    name,
    tags: (Array.isArray(get("metadata_tags"))
      ? (get("metadata_tags") as string[])
      : []
    ).filter(Boolean),
    price: Number(unwrap(get("metadata_price")) ?? 0),
    priceUnit: String(unwrap(get("metadata_price_unit")) ?? ""),
    priceCycle: Number(unwrap(get("metadata_price_cycle")) ?? 30),
    region: String(unwrap(get("metadata_region")) ?? ""),
    hidden: Boolean(unwrap(get("metadata_hidden")) ?? false),
  };
}

async function loadNodes() {
  loading.value = true;
  try {
    // Step 1: get all agent UUIDs
    const uuids = await kv.listAgentUuids();
    if (!uuids.length) {
      nodes.value = [];
      return;
    }

    // Step 2: batch fetch metadata_* for each agent namespace
    // Auto-create missing namespaces (error code 103) and retry
    const namespaceKeys = uuids.map((uuid) => ({
      namespace: uuid,
      key: "metadata_*",
    }));
    let results: { namespace: string; key: string; value: unknown }[] = [];

    for (let attempt = 0; attempt <= uuids.length; attempt++) {
      try {
        results = await kv.getMultiValue(namespaceKeys);
        break;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const match = msg.match(/Namespace '([^']+)' not found/);
        if (match && attempt < uuids.length) {
          await kv.createNamespace(match[1]!);
          continue;
        }
        throw e;
      }
    }

    // Step 3: detect empty UUIDs and initialize default metadata values
    const namespacesWithData = new Set(results.map((r) => r.namespace));
    const emptyUuids = uuids.filter((uuid) => !namespacesWithData.has(uuid));

    for (const emptyUuid of emptyUuids) {
      kv.namespace.value = emptyUuid;
      const defaultName = "节点" + emptyUuid.slice(-6);
      await Promise.all([
        kv.setValue("metadata_name", [defaultName]),
        kv.setValue("metadata_tags", [""]),
        kv.setValue("metadata_price", [0]),
        kv.setValue("metadata_price_unit", ["$"]),
        kv.setValue("metadata_price_cycle", [30]),
        kv.setValue("metadata_region", [""]),
        kv.setValue("metadata_hidden", [false]),
      ]);
    }

    // Step 4: re-fetch initialized namespaces and merge results
    if (emptyUuids.length > 0) {
      const newResults = await kv.getMultiValue(
        emptyUuids.map((uuid) => ({ namespace: uuid, key: "metadata_*" })),
      );
      results = [...results, ...newResults];
    }

    // Step 5: group by namespace
    const grouped = new Map<string, { key: string; value: unknown }[]>();
    for (const r of results) {
      if (!grouped.has(r.namespace)) grouped.set(r.namespace, []);
      grouped.get(r.namespace)!.push({ key: r.key, value: r.value });
    }

    // Step 6: parse and render
    const parsed: NodeItem[] = [];
    for (const [ns, entries] of grouped) {
      const node = parseNode(ns, entries);
      if (node) parsed.push(node);
    }
    nodes.value = parsed;
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "加载节点失败");
    nodes.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(loadNodes);

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
const saveLoading = ref(false);

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

async function handleSaveEdit() {
  if (!editingId.value) return;
  saveLoading.value = true;
  try {
    kv.namespace.value = editingId.value;
    const f = editForm.value;
    const { partialFailures } = await kv.setValueBatch([
      { key: "metadata_name", value: [f.name] },
      { key: "metadata_tags", value: f.tags },
      { key: "metadata_price", value: [f.price] },
      { key: "metadata_price_unit", value: [f.priceUnit] },
      { key: "metadata_price_cycle", value: [f.priceCycle] },
      { key: "metadata_region", value: f.region ? [f.region] : [] },
      { key: "metadata_hidden", value: [f.hidden] },
    ]);
    editDialogOpen.value = false;
    if (partialFailures.length > 0) {
      toast.warning(`部分字段保存失败：${partialFailures.join("、")}`);
    } else {
      toast.success("保存成功");
    }
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "保存失败");
  } finally {
    saveLoading.value = false;
  }
}
</script>

<template>
  <div
    v-if="loading"
    class="flex items-center justify-center py-12 text-muted-foreground"
  >
    <Loader2 class="h-5 w-5 animate-spin mr-2" />
    加载中...
  </div>

  <div
    v-else-if="nodes.length === 0"
    class="py-12 text-center text-muted-foreground text-sm"
  >
    暂无节点数据
  </div>

  <Table v-else>
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
        <TableCell class="font-medium">
          {{ node.name }}
          <span
            class="ml-1.5 text-xs text-muted-foreground font-normal font-mono"
            >{{ node.id }}</span
          >
        </TableCell>
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
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            @click="handleEdit(node)"
          >
            <Pencil class="h-4 w-4" />
          </Button>
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
        <Button
          variant="outline"
          :disabled="saveLoading"
          @click="editDialogOpen = false"
          >取消</Button
        >
        <Button :disabled="saveLoading" @click="handleSaveEdit">
          {{ saveLoading ? "保存中..." : "保存" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
