<script setup lang="ts">
import { ref } from "vue";
import { Code } from "lucide-vue-next";
import { Switch } from "@/components/ui/switch";
import CodeCard from "@/components/batch-exec/widgets/Code.vue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const code = ref("");
const codeTips = ref(false);

defineProps<{ modelValue: string }>();
defineEmits<{ "update:modelValue": (value: string) => void }>();
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <Code class="h-5 w-5" />{{ $t("dashboard.batchExec.codeInputLabel") }}
        </div>
        <Switch
          v-model="codeTips"
          :label="$t('dashboard.batchExec.codeTips')"
        />
      </CardTitle>
    </CardHeader>
    <CardContent>
      <CodeCard v-model="code" :codeTips="codeTips" />
    </CardContent>
  </Card>
</template>
