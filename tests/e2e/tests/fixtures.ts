import { test as base } from "vitest";

import { getOrCreateKittyInstance } from "../src/kitty.ts";
import { getOrCreateNvimInstance, disconnectNvim, type NvimInstance } from "../src/nvim.ts";
import { getOrCreateTmuxSession } from "../src/tmux.ts";

/** Capture pane text + freeze screenshot for debugging. */
async function captureFailureArtifacts(nvim: NvimInstance, name: string) {
  try {
    const paneText = await nvim.tmux.capture();
    const { writeFile, mkdir } = await import("node:fs/promises");
    const { writeSync } = await import("node:fs");
    const textPath = `/tmp/e2e-fail-${name}.txt`;
    await writeFile(textPath, paneText);
    const { execaCommand } = await import("execa");
    const imgPath = `/tmp/e2e-fail-${name}.png`;
    await mkdir("/tmp", { recursive: true });
    await execaCommand(
      `tmux -L ${nvim.tmux.socket} capture-pane -t ${nvim.tmux.session} -pe | freeze -o ${imgPath}`,
      { shell: true },
    );
    writeSync(2, `\n  Failure artifacts:\n    text: ${textPath}\n    screenshot: ${imgPath}\n`);
  } catch {
    // best effort
  }
}

/**
 * Reset buffer and assert clean state, retrying once if transient plugin
 * floats (which-key, noice) haven't settled yet.
 */
async function resetAndAssert(nvim: NvimInstance, label: string, testName?: string) {
  await nvim.resetBuffer(testName);
  let violations = await nvim.checkStartState();
  if (violations.length > 0) {
    // Transient float — give plugins a moment to settle, then retry once.
    await new Promise((r) => setTimeout(r, 50));
    await nvim.resetBuffer(testName);
    violations = await nvim.checkStartState();
    if (violations.length > 0) {
      const safeName = (testName ?? "unknown").replace(/[^a-zA-Z0-9-_]/g, "_");
      await captureFailureArtifacts(nvim, `${label}-${safeName}`);
      throw new Error(`nvim not in start state ${label} test:\n  ${violations.join("\n  ")}`);
    }
  }
}

/**
 * Extended test context with terminal fixtures.
 *
 * Persistent model: tmux + nvim are started on first run and left alive.
 * Subsequent test runs reuse the existing instances (near-instant startup).
 *
 * - tmux (worker): persistent tmux session, reused across runs
 * - rawNvim (worker): persistent nvim with LazyVim, reused across runs
 * - nvim (test): wraps rawNvim with automatic resetBuffer + state guard
 * - kitty (test): real kitty window, only for tagged tests
 */
export const test = base
  // Worker-scoped: connects to (or creates) the persistent tmux session.
  // Also opens a kitty viewer window so you can watch tests run.
  .extend("tmux", { scope: "worker" }, async () => {
    const tmux = await getOrCreateTmuxSession();
    // Best-effort: open a kitty window to observe tests (no-op if kitty isn't running)
    getOrCreateKittyInstance(tmux).catch((e) => {
      console.warn(`[e2e] Could not open kitty viewer: ${e.message}`);
    });
    return tmux;
  })

  // Worker-scoped: connects to (or creates) the persistent nvim instance.
  .extend("rawNvim", { scope: "worker" }, async ({ tmux }, { onCleanup }) => {
    const nvim = await getOrCreateNvimInstance(tmux);
    onCleanup(() => disconnectNvim(nvim));
    return nvim;
  })

  // Test-scoped: automatic reset + state guard around each test.
  .extend("nvim", async ({ rawNvim, task }, { onCleanup }) => {
    const safeName = task.name.replace(/[^a-zA-Z0-9-_]/g, "_");
    await resetAndAssert(rawNvim, "BEFORE", safeName);

    onCleanup(async () => {
      if (task?.result?.state === "fail") {
        await captureFailureArtifacts(rawNvim, safeName);
      }
      await resetAndAssert(rawNvim, "AFTER");
    });

    return rawNvim;
  })

  // Worker-scoped: persistent kitty OS window within the existing kitty app.
  .extend("kitty", { scope: "worker" }, async ({ tmux }) => {
    return getOrCreateKittyInstance(tmux);
  });
