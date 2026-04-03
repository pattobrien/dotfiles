import { defineConfig } from "vite-plus/lint";

export default defineConfig({
  categories: {
    correctness: "warn",
    suspicious: "warn",
    pedantic: "off",
  },
  options: {
    typeAware: true,
    typeCheck: true,
  },
  plugins: ["typescript", "unicorn", "oxc"],
  rules: {
    "no-unused-vars": "off",
    "no-unused-imports": "off",
    "no-console": "off",
    "typescript/no-explicit-any": "warn",
    "typescript/consistent-type-assertions": [
      "error",
      { assertionStyle: "never" },
    ],
    "unicorn/no-null": "off",
    "unicorn/prefer-node-protocol": "warn",
  },
  ignorePatterns: ["dist", "node_modules"],
});
