<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { Token } from "../type";
import { ScanEye } from "lucide-vue-next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

defineProps<{
  token: Token;
}>();
const { t } = useI18n();
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <ScanEye class="h-5 w-5" />
        {{ t("dashboard.token.previeJSON.title") }}
      </CardTitle>
    </CardHeader>

    <CardContent class="grid space-y-6">
      <pre class="overflow-x-auto text-xs leading-5">{{
        JSON.stringify(token, null, 2)
      }}</pre>
    </CardContent>
  </Card>
</template>
