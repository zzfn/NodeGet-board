<script setup lang="ts">
import { ref } from "vue";
import { X } from "lucide-vue-next";
import { SwitchRoot, SwitchThumb } from "reka-ui";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REGIONS } from "@/data/regions";
import type { NodeMetadata } from "@/types/node";

const PRICE_UNITS = [
  { symbol: "¥", label: "¥ 人民币" },
  { symbol: "$", label: "$ 美元" },
  { symbol: "€", label: "€ 欧元" },
  { symbol: "£", label: "£ 英镑" },
  { symbol: "₽", label: "₽ 卢布" },
  { symbol: "₣", label: "₣ 法郎" },
  { symbol: "₹", label: "₹ 卢比" },
  { symbol: "₫", label: "₫ 越南盾" },
  { symbol: "฿", label: "฿ 泰铢" },
];

const props = defineProps<{ modelValue: NodeMetadata }>();
const emit = defineEmits<{ "update:modelValue": [value: NodeMetadata] }>();

const tagInput = ref("");

function update(patch: Partial<NodeMetadata>) {
  emit("update:modelValue", { ...props.modelValue, ...patch });
}

function addTag() {
  const val = tagInput.value.trim();
  if (val && !props.modelValue.tags.includes(val)) {
    update({ tags: [...props.modelValue.tags, val] });
  }
  tagInput.value = "";
}

function removeTag(index: number) {
  const tags = [...props.modelValue.tags];
  tags.splice(index, 1);
  update({ tags });
}

function handleTagKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    addTag();
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- name -->
    <div class="space-y-2">
      <Label for="nm-name">节点名称</Label>
      <Input
        id="nm-name"
        :value="modelValue.name"
        placeholder="节点展示名称"
        @input="update({ name: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <!-- tags -->
    <div class="space-y-2">
      <Label>标签</Label>
      <div class="flex flex-wrap gap-2 mb-2">
        <Badge
          v-for="(tag, i) in modelValue.tags"
          :key="tag"
          variant="secondary"
          class="flex items-center gap-1 pr-1"
        >
          {{ tag }}
          <button
            type="button"
            class="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
            @click="removeTag(i)"
          >
            <X class="h-3 w-3" />
          </button>
        </Badge>
      </div>
      <Input
        v-model="tagInput"
        placeholder="输入标签后按回车或空格添加"
        @keydown="handleTagKeydown"
        @blur="addTag"
      />
    </div>

    <!-- price & priceUnit -->
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label for="nm-price">价格</Label>
        <Input
          id="nm-price"
          type="number"
          :value="modelValue.price"
          placeholder="0.00"
          min="0"
          step="0.01"
          @input="
            update({ price: Number(($event.target as HTMLInputElement).value) })
          "
        />
      </div>
      <div class="space-y-2">
        <Label>价格单位</Label>
        <Select
          :model-value="modelValue.priceUnit"
          @update:model-value="update({ priceUnit: $event as string })"
        >
          <SelectTrigger>
            <SelectValue placeholder="选择货币" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="u in PRICE_UNITS"
              :key="u.symbol"
              :value="u.symbol"
            >
              {{ u.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <!-- priceCycle -->
    <div class="space-y-2">
      <Label for="nm-price-cycle">计费周期（天）</Label>
      <Input
        id="nm-price-cycle"
        type="number"
        :value="modelValue.priceCycle"
        placeholder="30"
        min="1"
        @input="
          update({
            priceCycle: Number(($event.target as HTMLInputElement).value),
          })
        "
      />
    </div>

    <!-- region -->
    <div class="space-y-2">
      <Label>地区</Label>
      <Select
        :model-value="modelValue.region"
        @update:model-value="update({ region: $event as string })"
      >
        <SelectTrigger class="w-full">
          <SelectValue placeholder="选择地区" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="r in REGIONS" :key="r.code" :value="r.code">
            <span class="font-mono text-xs text-muted-foreground">{{
              r.code
            }}</span>
            <span class="ml-2">{{ r.name }}</span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- hidden -->
    <div class="flex items-center justify-between">
      <div class="space-y-0.5">
        <Label>隐藏节点</Label>
        <p class="text-sm text-muted-foreground">
          隐藏后该节点不在公开列表中展示
        </p>
      </div>
      <SwitchRoot
        :checked="modelValue.hidden"
        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
        @update:checked="update({ hidden: $event })"
      >
        <SwitchThumb
          class="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
        />
      </SwitchRoot>
    </div>
  </div>
</template>
