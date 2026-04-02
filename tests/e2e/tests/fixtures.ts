import { test as base } from "vite-plus/test";
import { getOrCreateTmuxSession } from "../src/tmux.ts";
import { getOrCreateNvimInstance, disconnectNvim } from "../src/nvim.ts";
import {
  createKittyInstance,
  destroyKittyInstance,
} from "../src/kitty.ts";

/**
 * Extended test context with terminal fixtures.
 *
 * Persistent model: tmux + nvim are started on first run and left alive.
 * Subsequent test runs reuse the existing instances (near-instant startup).
 *
 * - tmux (worker): persistent tmux session, reused across runs
 * - nvim (worker): persistent nvim with LazyVim, reused across runs
 * - Each test calls nvim.resetBuffer() for isolation
 * - kitty (test): real kitty window, only for tagged tests
 */
export const test = base
  // Worker-scoped: connects to (or creates) the persistent tmux session.
  // Does NOT kill on cleanup — session stays alive for next run.
  .extend("tmux", { scope: "worker" }, async ({}) => {
    return getOrCreateTmuxSession();
  })

  // Worker-scoped: connects to (or creates) the persistent nvim instance.
  // Disconnects RPC on cleanup but does NOT kill nvim.
  .extend("nvim", { scope: "worker" }, async ({ tmux }, { onCleanup }) => {
    const nvim = await getOrCreateNvimInstance(tmux);
    onCleanup(() => disconnectNvim(nvim));
    return nvim;
  })

  // Test-scoped, lazy: only initializes when destructured (kitty-tagged tests)
  .extend("kitty", async ({ tmux }, { onCleanup }) => {
    const kitty = await createKittyInstance(tmux);
    onCleanup(() => destroyKittyInstance(kitty));
    return kitty;
  });
