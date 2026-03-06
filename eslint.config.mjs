import { defineConfig } from "eslint/config";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([
  {
    files: ["**/*.ts"],
    ignores: ["**/*.d.ts"],
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      semi: "error",
      "prefer-const": "error",
    },
  },
]);
