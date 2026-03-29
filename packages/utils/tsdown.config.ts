import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { defineConfig } from "vite-plus/pack";

const require = createRequire(import.meta.url);
const tsgoPath = join(
  dirname(require.resolve("@typescript/native-preview/package.json")),
  "bin/tsgo.js",
);

export default defineConfig({
  dts: {
    tsgo: { path: tsgoPath },
  },
  exports: true,
});
