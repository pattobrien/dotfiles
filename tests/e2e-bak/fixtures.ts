import { test as base } from "vitest";
import {
  createTmuxServer,
  createTmuxSession,
  killTmuxSession,
} from "./helpers/tmux.ts";
import { createNvimInstance, destroyNvimInstance } from "./helpers/nvim.ts";
import {
  createKittyInstance,
  destroyKittyInstance,
} from "./helpers/kitty.ts";
import { saveFailureScreenshot } from "./helpers/screenshot.ts";

import type { TmuxSession } from "./helpers/tmux.ts";
import type { NvimInstance } from "./helpers/nvim.ts";
import type { KittyInstance } from "./helpers/kitty.ts";

let sessionCounter = 0;

/**
 * Extended test context with terminal fixtures.
 *
 * - `tmux` (test scope): fresh tmux session per test, auto-cleaned
 * - `nvim` (test scope, lazy): nvim inside tmux, only starts if destructured
 * - `kitty` (test scope, lazy): real kitty window, only starts if destructured
 */
export const test = base
  // File-scoped: one tmux server per test file (lightweight)
  .extend("tmuxServer", { scope: "file" }, async ({}, { onCleanup }) => {
    const socket = `e2e-${process.pid}-${Date.now()}`;
    const server = await createTmuxServer(socket);
    onCleanup(() => server.kill());
    return socket;
  })

  // Test-scoped: fresh session per test
  .extend<{ tmux: TmuxSession }>(
    "tmux",
    async ({ tmuxServer }, { onCleanup }) => {
      const session = `t-${++sessionCounter}`;
      console.log(`[fixture-debug] creating tmux session: ${session}`);
      const tmux = await createTmuxSession(tmuxServer, session);
      console.log(`[fixture-debug] tmux session created: ${session}`);

      onCleanup(async () => {
        // Always save a failure screenshot — it's cheap and useful for debugging.
        // Screenshots are written to tests/e2e/test-results/.
        await saveFailureScreenshot(tmux, session).catch(() => {});
        await killTmuxSession(tmuxServer, session);
      });

      return tmux;
    },
  )

  // Test-scoped, lazy: only initializes when destructured
  .extend<{ nvim: NvimInstance }>(
    "nvim",
    async ({ tmux }, { onCleanup }) => {
      const nvim = await createNvimInstance(tmux);
      onCleanup(() => destroyNvimInstance(nvim));
      return nvim;
    },
  )

  // Test-scoped, lazy: only initializes when destructured (kitty-tagged tests)
  .extend<{ kitty: KittyInstance }>(
    "kitty",
    async ({ tmux }, { onCleanup }) => {
      const kitty = await createKittyInstance(tmux);
      onCleanup(() => destroyKittyInstance(kitty));
      return kitty;
    },
  );
