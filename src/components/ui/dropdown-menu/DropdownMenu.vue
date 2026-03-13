<script setup lang="ts">
import { DropdownMenuRoot } from "reka-ui";
import type { DropdownMenuRootProps, DropdownMenuRootEmits } from "reka-ui";
import { useForwardPropsEmits } from "reka-ui";

const props = defineProps<DropdownMenuRootProps>();
const emits = defineEmits<DropdownMenuRootEmits>();
const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <DropdownMenuRoot v-bind="forwarded">
    <slot />
  </DropdownMenuRoot>
</template>
