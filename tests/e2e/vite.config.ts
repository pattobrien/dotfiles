import path from "node:path";

import { defineConfig } from "vite-plus";

const dotfiles = path.resolve(import.meta.dirname, "../..");

export default defineConfig({
  fmt: {},
  test: {
    // All test files share one persistent nvim instance — serialize to avoid
    // concurrent buffer operations on the same nvim.
    fileParallelism: false,
    tags: [
      {
        name: "kitty",
        description: "Requires a real kitty instance (GUI, steals focus). Excluded by default.",
        timeout: 30_000,
      },
      {
        name: "macos-gui",
        description: "Requires macOS GUI automation and may steal focus. Excluded by default.",
        timeout: 120_000,
      },
      {
        name: "apps",
        description: "Requires real app installs and may launch desktop apps. Excluded by default.",
        timeout: 180_000,
      },
      {
        name: "setup-validation",
        description: "Opt-in fresh-machine setup validation checks. Excluded by default.",
        timeout: 180_000,
      },
    ],
    // @ts-expect-error tagsFilter exists at runtime but is missing from bundled types
    tagsFilter: ["!kitty", "!macos-gui", "!apps", "!setup-validation"],
    testTimeout: 5_000,
    hookTimeout: 15_000, // first-run nvim startup can take a few seconds
    // Re-run tests when the config files they test change.
    // vitest doesn't support per-file triggers, so we list all config paths
    // and the test names in the glob patterns make it clear which is which.
    forceRerunTriggers: [
      `${dotfiles}/.config/kitty/**`,
      `${dotfiles}/.config/tmux/**`,
      `${dotfiles}/.config/nvim/**`,
      `${dotfiles}/zsh/**`,
      `${dotfiles}/.config/mise/**`,
    ],
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
