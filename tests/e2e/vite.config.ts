import path from "node:path";

import { defineConfig } from "vite-plus";

const dotfiles = path.resolve(import.meta.dirname, "../..");

// The neovim package uses msgpack async generators over raw Node streams.
// Vite's module runner transforms the module in a way that breaks the
// streaming decode loop, causing RPC calls to hang.
const serverDeps = {
  deps: {
    external: [/neovim/, /@msgpack/, /msgpack/],
  },
};

export default defineConfig({
  fmt: {},
  test: {
    include: ["tests/integration/**/*.test.ts", "tests/e2e/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Worker-scoped fixtures (nvim, tmux) serialize within a worker, and the
    // real-kitty tests steal focus — everything stays strictly serial.
    fileParallelism: false,
    testTimeout: 5_000,
    hookTimeout: 5_000,
    tags: [
      {
        name: "e2e-kitty",
        description: "Opens real kitty OS windows (graphics/pixel assertions).",
      },
    ],
    // Real-kitty tests are opt-in: excluded by default so a bare `vp test`
    // never opens windows; `vp test --tagsFilter=e2e-kitty` runs them.
    tagsFilter: ["!e2e-kitty"],
    forceRerunTriggers: [
      `${dotfiles}/.config/herdr/**`,
      `${dotfiles}/.config/tmux/**`,
      `${dotfiles}/.config/nvim/**`,
      `${dotfiles}/.config/kitty/**`,
      `${dotfiles}/zsh/**`,
    ],
    server: serverDeps,
  },
});
