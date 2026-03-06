<script setup lang="ts">
import { RouterLink } from "vue-router";
import { ref, onMounted } from "vue";
import { ArrowLeft, Menu, Moon, Sun } from "lucide-vue-next";
import { Button } from "@/components/ui/button";

const emit = defineEmits<{
  openMobileSidebar: [];
}>();

const isDark = ref(false);

const toggleTheme = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add("dark");
    document.cookie = "theme=dark; path=/; max-age=31536000";
  } else {
    document.documentElement.classList.remove("dark");
    document.cookie = "theme=light; path=/; max-age=31536000";
  }
};

onMounted(() => {
  const themeCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("theme="))
    ?.split("=")[1];
  if (themeCookie === "dark") {
    isDark.value = true;
    document.documentElement.classList.add("dark");
  } else {
    isDark.value = false;
    document.documentElement.classList.remove("dark");
  }
});
</script>

<template>
  <header class="flex h-14 shrink-0 items-center border-b px-4 gap-3">
    <Button
      variant="ghost"
      size="icon"
      class="md:hidden shrink-0"
      @click="emit('openMobileSidebar')"
    >
      <Menu class="h-5 w-5" />
    </Button>
    <div class="ml-auto">
      <Button variant="ghost" size="icon" @click="toggleTheme">
        <Moon
          v-if="!isDark"
          class="h-[1.2rem] w-[1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
        />
        <Sun
          v-else
          class="h-[1.2rem] w-[1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
        />
        <span class="sr-only">Toggle theme</span>
      </Button>
      <RouterLink to="/">
        <Button variant="ghost" size="sm">
          <ArrowLeft class="h-4 w-4 mr-1" />
          返回监控
        </Button>
      </RouterLink>
    </div>
  </header>
</template>
