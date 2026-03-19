<script setup lang="ts">
import TokenList from "@/components/token/token-list/tokenListCard.vue";

import { useRouter } from "vue-router";

const router = useRouter();

const toCreateToken = () => {
  router.push("/dashboard/tokenCeate");
};
</script>

<template>
  <div class="h-full flex flex-col space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">Tokens</h2>
        <p class="text-muted-foreground">Manage your API tokens securely.</p>
      </div>
    </div>

    <div>
      <TokenList></TokenList>
    </div>
  </div>
</template>
