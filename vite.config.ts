import { defineConfig } from "vite-plus";

import { CtrfReporter } from "./tests/e2e/src/ctrf-reporter.ts";

// Reporters and server.deps live here because vitest only honors them at the
// workspace root; tests/e2e keeps its own copies for standalone runs.
export default defineConfig({
  fmt: {
    printWidth: 80,
    trailingComma: "all",
    sortImports: {
      newlinesBetween: true,
      groups: [
        "builtin",
        ["value-external", "type-external"],
        ["value-internal", "type-internal"],
        ["type-parent", "value-parent"],
        ["value-sibling", "type-sibling"],
        ["type-index", "value-index"],
      ],
    },
    sortPackageJson: false,
    sortTailwindcss: {
      functions: ["cn", "cva"],
    },
    proseWrap: "always",
    ignorePatterns: [
      ".agents/skills",
      ".agents/.skill-lock.json",
      "claude/skills",
      "dotbot",
      ".config/gh/hosts.yml",
      ".config/karabiner",
      ".config/superwhisper",
      ".config/tinycast/settings.json",
      ".config/vite-plus/config.json",
      ".claude/settings.json",
      "claude/settings.json",
      "thaw",
      ".config/nvim/lazy-lock.json",
      ".cache",
      ".git",
      ".next",
      ".vercel",
      ".turbo",
      "node_modules",
      "dist",
      "build",
      "coverage",
      "**/Spoons/**",
    ],
    overrides: [
      {
        files: ["**/*.jsonc"],
        options: {
          trailingComma: "none",
        },
      },
    ],
  },
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
