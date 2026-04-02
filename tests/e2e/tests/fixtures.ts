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
 * Scoping strategy (matches how you actually use the tools):
 * - tmuxServer (worker): one tmux server per worker — 400ms config load once
 * - tmux (file): one session per test file — shell starts once, reused across tests
 * - nvim (file): one nvim per test file — LazyVim + plugins load once
 * - Each test gets a fresh empty buffer via resetNvim (test-scoped)
 * - kitty (test): real kitty window, only for tagged tests
 */
export const test = base
  // Worker-scoped: one tmux server per worker process.
  .extend("tmuxServer", { scope: "worker" }, async ({}, { onCleanup }) => {
    const socket = `e2e-${process.pid}`;
    const server = await createTmuxServer(socket);
    onCleanup(() => server.kill());
    return socket;
  })

  // File-scoped: one tmux session per test file (shell starts once).
  .extend("tmux", { scope: "file" }, async ({ tmuxServer }, { onCleanup }) => {
    const session = `t-${++sessionCounter}`;
    const tmux = await createTmuxSession(tmuxServer, session);

    onCleanup(async () => {
      await saveFailureScreenshot(tmux, session).catch(() => {});
      await killTmuxSession(tmuxServer, session);
    });

    return tmux;
  })

  // File-scoped: one nvim instance per test file. LazyVim + plugins load once.
  .extend("nvim", { scope: "file" }, async ({ tmux }, { onCleanup }) => {
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
