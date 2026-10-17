const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier");

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ["dist/*", "coverage/*", ".expo/*"],
  },
  {
    files: ["src/modules/*/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-native", "expo*", "@tanstack/*", "zustand", "zod"],
              message: "domain deve ser TypeScript puro, sem framework.",
            },
            {
              group: ["@/modules/*/data/*", "@/modules/*/infra/*", "@/modules/*/presentation/*"],
              message: "domain não depende das camadas externas.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/*/data/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-native", "expo*", "@tanstack/*", "zustand"],
              message: "data (casos de uso) não conhece UI nem framework.",
            },
            {
              group: ["@/modules/*/infra/*", "@/modules/*/presentation/*"],
              message: "data depende só de domain e de protocolos.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/core/**/*.{ts,tsx}", "src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*", "@/main/*", "@/app/*"],
              message: "core/shared não podem depender de módulos de negócio.",
            },
          ],
        },
      ],
    },
  },
]);
