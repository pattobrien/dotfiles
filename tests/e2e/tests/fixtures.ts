import { test as base } from "vite-plus/test";
import { getOrCreateTmuxSession } from "../src/tmux.ts";
import {
  getOrCreateNvimInstance,
  disconnectNvim,
  type NvimInstance,
} from "../src/nvim.ts";
import { getOrCreateKittyInstance } from "../src/kitty.ts";

/**
 * Reset buffer and assert clean state, retrying once if transient plugin
 * floats (which-key, noice) haven't settled yet.
 */
async function resetAndAssert(
  nvim: NvimInstance,
  label: string,
  testName?: string,
) {
  await nvim.resetBuffer(testName);
  let violations = await nvim.checkStartState();
  if (violations.length > 0) {
    // Transient float — give plugins a moment to settle, then retry once.
    await new Promise((r) => setTimeout(r, 50));
    await nvim.resetBuffer(testName);
    violations = await nvim.checkStartState();
    if (violations.length > 0) {
      throw new Error(
        `nvim not in start state ${label} test:\n  ${violations.join("\n  ")}`,
      );
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
  .extend("tmux", { scope: "worker" }, async ({}) => {
    return getOrCreateTmuxSession();
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
      // On failure: capture pane text + freeze screenshot for debugging
      if (task?.result?.state === "fail") {
        const name =
          task.name?.replace(/[^a-zA-Z0-9-_]/g, "_") ?? "unknown";
        try {
          const paneText = await rawNvim.tmux.capture();
          const { writeFile, mkdir } = await import("node:fs/promises");
          const { writeSync } = await import("node:fs");
          const textPath = `/tmp/e2e-fail-${name}.txt`;
          await writeFile(textPath, paneText);
          const { execaCommand } = await import("execa");
          const imgPath = `/tmp/e2e-fail-${name}.png`;
          await mkdir("/tmp", { recursive: true });
          await execaCommand(
            `tmux -L ${rawNvim.tmux.socket} capture-pane -t ${rawNvim.tmux.session} -pe | freeze -o ${imgPath}`,
            { shell: true },
          );
          writeSync(
            2,
            `\n  Failure artifacts:\n    text: ${textPath}\n    screenshot: ${imgPath}\n`,
          );
        } catch {
          // best effort
        }
      }

      await resetAndAssert(rawNvim, "AFTER");
    });

    return rawNvim;
  })

  // Worker-scoped: persistent kitty OS window within the existing kitty app.
  .extend("kitty", { scope: "worker" }, async ({ tmux }) => {
    return getOrCreateKittyInstance(tmux);
  });
