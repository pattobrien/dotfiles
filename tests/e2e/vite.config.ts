import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
  test: {
    // Nvim tests share /tmp socket paths keyed by session name — running files
    // in parallel causes socket collisions and startup races. Serializing files
    // keeps each nvim instance isolated while tests within a file still run sequentially.
    fileParallelism: false,
    tags: [
      {
        name: "kitty",
        description:
          "Requires a real kitty instance (GUI, steals focus). Excluded by default.",
        timeout: 30_000,
      },
    ],
    // @ts-expect-error tagsFilter exists at runtime but is missing from bundled types
    tagsFilter: ["!kitty"],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    server: {
      deps: {
        // The neovim package uses msgpack async generators over raw Node
        // streams. Vite's module runner transforms the module in a way that
        // breaks the streaming decode loop, causing RPC calls to hang.
        external: [/neovim/, /@msgpack/, /msgpack/],
      },
    },
  },
});
