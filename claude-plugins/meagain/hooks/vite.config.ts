import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    include: ["schemas.test-d.ts"],
    typecheck: {
      enabled: true,
      checker: "tsgo",
      tsconfig: "./tsconfig.json",
    },
  },
});
