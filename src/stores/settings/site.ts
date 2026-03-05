import { ref } from "vue";
import { defineStore } from "pinia";

export const useSiteStore = defineStore(
  "settings-site",
  () => {
    const customHeader = ref("");
    const customBody = ref("");
    return { customHeader, customBody };
  },
  { persist: true },
);
