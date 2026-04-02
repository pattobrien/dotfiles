import { test as base } from "vite-plus/test";
import {
  createTmuxServer,
  createTmuxSession,
  killTmuxSession,
} from "../src/tmux.ts";
import { createNvimInstance, destroyNvimInstance } from "../src/nvim.ts";
import {
  createKittyInstance,
  destroyKittyInstance,
} from "../src/kitty.ts";
import { saveFailureScreenshot } from "../src/screenshot.ts";

let sessionCounter = 0;

/**
 * Extended test context with terminal fixtures.
 *
 * - `tmux` (test scope): fresh tmux session per test, auto-cleaned
 * - `nvim` (test scope, lazy): nvim inside tmux, only starts if destructured
 * - `kitty` (test scope, lazy): real kitty window, only starts if destructured
 */
export const test = base
  // Worker-scoped: one tmux server per worker process.
  // Loading ~/.tmux.conf (TPM plugins) takes ~400ms — worker scope means
  // this only happens once per worker, not once per test file.
  .extend("tmuxServer", { scope: "worker" }, async ({}, { onCleanup }) => {
    const socket = `e2e-${process.pid}`;
    const server = await createTmuxServer(socket);
    onCleanup(() => server.kill());
    return socket;
  })

  // Test-scoped: fresh session per test
  .extend("tmux", async ({ tmuxServer, task }, { onCleanup }) => {
    const session = `t-${++sessionCounter}`;
    const tmux = await createTmuxSession(tmuxServer, session);

    onCleanup(async () => {
      // Only save screenshot on failure — freeze takes ~500ms per call.
      if (task.result?.state === "fail") {
        await saveFailureScreenshot(tmux, session).catch(() => {});
      }
      await killTmuxSession(tmuxServer, session);
    });

    return tmux;
  })

  // Test-scoped, lazy: only initializes when destructured
  .extend("nvim", async ({ tmux }, { onCleanup }) => {
    const nvim = await createNvimInstance(tmux);
    onCleanup(() => destroyNvimInstance(nvim));
    return nvim;
  })

  // Test-scoped, lazy: only initializes when destructured (kitty-tagged tests)
  .extend("kitty", async ({ tmux }, { onCleanup }) => {
    const kitty = await createKittyInstance(tmux);
    onCleanup(() => destroyKittyInstance(kitty));
    return kitty;
  });
