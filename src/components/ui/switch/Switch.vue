<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { useVModel } from "@vueuse/core";
import { cn } from "@/lib/utils";
import { SwitchRoot, SwitchThumb } from "reka-ui";

const props = defineProps<{
  modelValue?: boolean;
  defaultValue?: boolean;
  class?: HTMLAttributes["class"];
  label?: string;
  id?: string;
}>();

const emits = defineEmits<{
  (e: "update:modelValue", payload: boolean): void;
}>();

const modelValue = useVModel(props, "modelValue", emits, {
  passive: true,
  defaultValue: props.defaultValue ?? false,
});

// 如果用户没传 id，则生成一个随机 id
const switchId =
  props.id || `switch-${Math.random().toString(36).slice(2, 10)}`;
</script>

<template>
  <div class="flex gap-2 items-center">
    <label
      v-if="label"
      :for="switchId"
      class="text-stone-700 dark:text-white text-sm leading-none pr-2 select-none"
    >
      {{ label }}
    </label>

    <SwitchRoot
      :id="switchId"
      v-model="modelValue"
      :class="
        cn(
          'w-[32px] h-[20px] shadow-sm flex data-[state=unchecked]:bg-stone-300 data-[state=checked]:bg-stone-800 dark:data-[state=unchecked]:bg-stone-800 dark:data-[state=checked]:bg-stone-700 border border-stone-300 data-[state=checked]:border-stone-700 dark:border-stone-700 rounded-full relative transition-[background] focus-within:outline-none focus-within:shadow-[0_0_0_1px] focus-within:border-stone-800 focus-within:shadow-stone-800',
          props.class,
        )
      "
    >
      <SwitchThumb
        class="w-3.5 h-3.5 my-auto bg-white text-xs flex items-center justify-center shadow-xl rounded-full transition-transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-full"
      />
    </SwitchRoot>
  </div>
</template>
