import { defineConfig } from "vite-plus/pack";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: "esm",
  outDir: "dist",
  clean: true,
});
