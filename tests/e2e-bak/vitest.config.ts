import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    globalSetup: "./global-setup.ts",
    tags: [
      {
        name: "kitty",
        description:
          "Requires a real kitty instance (GUI, steals focus). Excluded by default.",
        timeout: 30_000,
      },
    ],
    tagsFilter: ["!kitty"],
    testTimeout: 5_000,
    hookTimeout: 5_000,
    server: {
      deps: {
        // The neovim package uses msgpack async generators over raw Node
        // streams.  Vite's module runner transforms the module in a way that
        // breaks the streaming decode loop, causing RPC calls to hang.
        // Marking it external forces Node to load it natively.
        external: [/neovim/, /@msgpack/],
      },
    },
  },
});
