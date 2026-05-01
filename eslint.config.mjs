import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Data fetching on mount is a legitimate pattern; treat as warning
      "react-hooks/set-state-in-effect": "warn",
      // Allow `any` where we're interfacing with unknown JSON shapes;
      // prefer fixing case-by-case but don't block the build
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars stay as warnings
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
