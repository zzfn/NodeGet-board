<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useBackendStore } from "@/composables/useBackendStore";
import { useTokenListHook } from "./useTokenList";
// import CreateTokenCard from '@/components/token-manage/CreateTokenCard.vue';
// import DeleteTokenCard from '@/components/token-manage/DeleteTokenCard.vue';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/Table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import { useRouter } from "vue-router";

const useTokenList = useTokenListHook();
const router = useRouter();

const tokensList = ref<any[]>([]);

onMounted(() => {
  useTokenList.getTokenList().then((res) => {
    console.log(res, "tokensList");
    tokensList.value = res;
  });
});
const toCreateToken = () => {
  router.push("/dashboard/tokenCeate");
};
</script>

<template>
  <!-- class="grid gap-6 xl:grid-cols-2" -->
  <div>
    <!-- <CreateTokenCard />
      <DeleteTokenCard /> -->
    <!-- token列表 -->
    <div class="flex justify-between">
      <div><Input placeholder="Enter text" /></div>
      <div>
        <Button @click="toCreateToken">Create Token</Button>
      </div>
    </div>
    <Table class="w-full">
      <!-- <TableCaption>A list of your recent tokens.</TableCaption> -->
      <TableHeader>
        <TableRow>
          <TableHead>version</TableHead>
          <TableHead>username</TableHead>
          <TableHead>token_key</TableHead>
          <TableHead>token_limit</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="token in tokensList" :key="token.id">
          <TableCell>{{ token.version }}</TableCell>
          <TableCell>{{ token.username }}</TableCell>
          <TableCell>{{ token.token_key }}</TableCell>
          <TableCell>
            <Button>查看</Button>
          </TableCell>
          <TableCell> </TableCell>
        </TableRow>
      </TableBody>
      <TableFooter class="w-full">
        <TableRow>
          <TableCell colSpan="{3}">Total</TableCell>
          <TableCell className="text-right"
            >{{ tokensList?.length }}条</TableCell
          >
        </TableRow>
      </TableFooter>
    </Table>
  </div>
</template>
