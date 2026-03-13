import { defineStore } from "pinia";
import { ref, watch } from "vue";

export const useThemeStore = defineStore("theme", () => {
  const isDark = ref(false);

  const apply = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    document.cookie = `theme=${dark ? "dark" : "light"}; path=/; max-age=31536000`;
  };

  const init = () => {
    const themeCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("theme="))
      ?.split("=")[1];
    isDark.value = themeCookie === "dark";
    apply(isDark.value);
  };

  const toggle = () => {
    isDark.value = !isDark.value;
  };

  watch(isDark, apply);

  return { isDark, init, toggle };
});
