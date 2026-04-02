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
    testTimeout: 5_000,
    hookTimeout: 5_000,
    teardownTimeout: 3_000,
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
