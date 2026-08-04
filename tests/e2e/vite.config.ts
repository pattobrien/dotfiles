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
    projects: [
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["./tests/setup.ts"],
          // Worker-scoped fixtures (nvim, tmux) serialize within a worker;
          // file parallelism stays off until parallel workers are proven out.
          fileParallelism: false,
          testTimeout: 10_000,
          hookTimeout: 30_000, // per-run nvim/herdr cold starts
          forceRerunTriggers: [
            `${dotfiles}/.config/herdr/**`,
            `${dotfiles}/.config/tmux/**`,
            `${dotfiles}/.config/nvim/**`,
            `${dotfiles}/zsh/**`,
          ],
          server: serverDeps,
        },
      },
      {
        test: {
          name: "e2e",
          include: ["tests/e2e/**/*.test.ts"],
          setupFiles: ["./tests/setup.ts"],
          // Real kitty: GUI windows, focus stealing — strictly serial.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
          forceRerunTriggers: [`${dotfiles}/.config/kitty/**`],
          server: serverDeps,
        },
      },
    ],
  },
});
