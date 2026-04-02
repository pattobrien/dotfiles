import { test as base, beforeEach, afterEach } from "vite-plus/test";
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
 * - afterEach verifies nvim is back to clean start state
 * - kitty (test): real kitty window, only for tagged tests
 */
export const test = base
  // Worker-scoped: connects to (or creates) the persistent tmux session.
  .extend("tmux", { scope: "worker" }, async ({}) => {
    return getOrCreateTmuxSession();
  })

  // Worker-scoped: connects to (or creates) the persistent nvim instance.
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

/**
 * After each nvim test, reset buffer and verify clean state.
 * Call this in any test file that uses the `nvim` fixture.
 */
export function useNvimStateGuard() {
  let nvimRef: Awaited<ReturnType<typeof getOrCreateNvimInstance>> | null = null;

  beforeEach(async ({ nvim }: any) => {
    if (!nvim) return;
    nvimRef = nvim;
    await nvim.resetBuffer();
    const violations = await nvim.checkStartState();
    if (violations.length > 0) {
      throw new Error(`nvim not in start state BEFORE test:\n  ${violations.join("\n  ")}`);
    }
  });

  afterEach(async () => {
    if (!nvimRef) return;
    await nvimRef.resetBuffer();
    const violations = await nvimRef.checkStartState();
    if (violations.length > 0) {
      throw new Error(`nvim not in start state AFTER test:\n  ${violations.join("\n  ")}`);
    }
    nvimRef = null;
  });
}
