<!-- TODO: 未实现将 customHeader / customBody 注入到页面 <head> / <body> 的逻辑 -->
<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { toast } from "vue-sonner";
import { useSiteStore } from "@/stores/settings/site";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const store = useSiteStore();
const { customHeader, customBody } = storeToRefs(store);

const localHeader = ref(customHeader.value);
const localBody = ref(customBody.value);

function saveHeader() {
  store.customHeader = localHeader.value;
  toast.success("保存成功");
}

function saveBody() {
  store.customBody = localBody.value;
  toast.success("保存成功");
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-bold mb-1">自定义</h1>
      <p class="text-muted-foreground text-sm">
        请确保代码的安全性，避免使用不受信任的内容。
      </p>
    </div>

    <Card class="py-4 gap-3">
      <CardHeader class="px-4">
        <CardTitle class="text-base">自定义 Header</CardTitle>
        <CardDescription> 在页面头部添加自定义内容 </CardDescription>
      </CardHeader>
      <CardContent class="px-4">
        <textarea
          v-model="localHeader"
          class="flex min-h-[96px] w-full rounded-md border bg-transparent px-3 py-2 text-sm font-mono shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          placeholder="<script>...</script>"
        />
      </CardContent>
      <CardFooter class="justify-end px-4">
        <Button size="sm" @click="saveHeader">保存</Button>
      </CardFooter>
    </Card>

    <Card class="py-4 gap-3">
      <CardHeader class="px-4">
        <CardTitle class="text-base">自定义 Body</CardTitle>
        <CardDescription> 在页面底部添加自定义内容 </CardDescription>
      </CardHeader>
      <CardContent class="px-4">
        <textarea
          v-model="localBody"
          class="flex min-h-[96px] w-full rounded-md border bg-transparent px-3 py-2 text-sm font-mono shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          placeholder="<script>...</script>"
        />
      </CardContent>
      <CardFooter class="justify-end px-4">
        <Button size="sm" @click="saveBody">保存</Button>
      </CardFooter>
    </Card>
  </div>
</template>
