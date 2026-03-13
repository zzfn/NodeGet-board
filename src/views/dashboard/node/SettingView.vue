<script setup lang="ts">
import { ref } from "vue";
import { useRoute } from "vue-router";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import NodeMetadataForm from "@/components/node/NodeMetadataForm.vue";
import type { NodeMetadata } from "@/types/node";

const route = useRoute();
const _uuid = route.params.uuid as string;

const form = ref<NodeMetadata>({
  name: "Hong Kong Node 01",
  tags: ["BGP", "CMI", "premium"],
  price: 29.9,
  priceUnit: "¥",
  priceCycle: 30,
  region: "HK",
  hidden: false,
});

function handleSave() {
  toast.success("保存成功");
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex-1 overflow-auto rounded-md border bg-card p-6">
      <div class="max-w-lg space-y-6">
        <div>
          <h2 class="text-lg font-semibold">节点设置</h2>
          <p class="text-sm text-muted-foreground mt-1">
            配置节点的展示元数据信息
          </p>
        </div>

        <NodeMetadataForm v-model="form" />

        <div class="pt-2">
          <Button @click="handleSave">保存</Button>
        </div>
      </div>
    </div>
  </div>
</template>
