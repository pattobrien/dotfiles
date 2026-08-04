import { defineConfig } from "vite-plus";

import { CtrfReporter } from "./tests/e2e/src/ctrf-reporter.ts";

// Reporters and server.deps live here because vitest only honors them at the
// workspace root; tests/e2e keeps its own copies for standalone runs.
export default defineConfig({
  test: {
    projects: ["tools/scripts", "tests/e2e"],
    // The neovim package uses msgpack async generators over raw Node streams;
    // Vite's module runner transform breaks the streaming decode loop.
    server: {
      deps: {
        external: [/neovim/, /@msgpack/, /msgpack/],
      },
    },
    reporters: [
      "default",
      "html",
      new CtrfReporter(),
      ...(process.env.GITHUB_ACTIONS ? (["github-actions"] as const) : []),
    ],
  },
});
