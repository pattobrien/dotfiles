import { writeSync } from "node:fs";
import { writeFile } from "node:fs/promises";

import { test as base } from "vite-plus/test";

import { createHerdrSession, type HerdrTestSession } from "../src/herdr.ts";
import { viewerLink } from "../src/recording.ts";
import { getOrCreateKittyInstance } from "../src/kitty.ts";
import { launchNvimInstance, type NvimInstance } from "../src/nvim.ts";
import { createTmuxSession } from "../src/tmux.ts";

/** Write screen text + SVG screenshot from the emulator for debugging. */
async function captureFailureArtifacts(nvim: NvimInstance, name: string) {
  try {
    const textPath = `/tmp/e2e-fail-${name}.txt`;
    const svgPath = `/tmp/e2e-fail-${name}.svg`;
    await writeFile(textPath, nvim.term.text());
    await writeFile(svgPath, nvim.term.term.screenshotSvg());
    writeSync(2, `\n  Failure artifacts:\n    text: ${textPath}\n    screenshot: ${svgPath}\n`);
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
 * Lifecycle model: fixtures are created fresh per worker (nvim, tmux) or per
 * test (herdr) and torn down on cleanup — nothing persists between runs.
 *
 * - tmux (worker): fresh scoped tmux server, killed on worker exit
 * - rawNvim (worker): fresh nvim under an emulator PTY, disposed on exit
 * - nvim (test): wraps rawNvim with automatic resetBuffer + state guard
 * - herdr (test): isolated herdr server/session + SDK client + emulator
 * - kitty (worker): real kitty window attached to the tmux fixture (e2e tier)
 */
export const test = base
  // Worker-scoped: fresh tmux server on a unique socket.
  .extend("tmux", { scope: "worker" }, async ({}, { onCleanup }) => {
    const tmux = await createTmuxSession();
    onCleanup(() => tmux.dispose());
    return tmux;
  })

  // Worker-scoped: fresh nvim with LazyVim under an emulator PTY.
  .extend("rawNvim", { scope: "worker" }, async ({}, { onCleanup }) => {
    const nvim = await launchNvimInstance();
    onCleanup(() => nvim.dispose());
    return nvim;
  })

  // Test-scoped: automatic reset + state guard around each test.
  .extend("nvim", async ({ rawNvim, task, annotate }, { onCleanup }) => {
    const safeName = task.name.replace(/[^a-zA-Z0-9-_]/g, "_");
    // Each test file runs in its own isolated worker (one nvim per file) —
    // name the recording after the file so runs don't overwrite each other.
    const fileName = task.file.name
      .split("/")
      .pop()
      ?.replace(/\.test\.ts$/, "");
    if (fileName) rawNvim.term.relabel(fileName);
    rawNvim.term.mark(task.name);
    await annotate(`terminal recording: ${viewerLink(fileName ?? "nvim")}`);
    await resetAndAssert(rawNvim, "BEFORE", safeName);

    onCleanup(async () => {
      if (task?.result?.state === "fail") {
        await captureFailureArtifacts(rawNvim, safeName);
      }
      await resetAndAssert(rawNvim, "AFTER");
    });

    return rawNvim;
  })

  // Test-scoped: isolated herdr server + SDK client + attached emulator.
  .extend("herdr", async ({ task, annotate }, { onCleanup }): Promise<HerdrTestSession> => {
    const label = `herdr ${task.name}`;
    const session = await createHerdrSession({ label });
    await annotate(`terminal recording: ${viewerLink(label)}`);
    onCleanup(() => session.dispose());
    return session;
  })

  // Worker-scoped: real kitty OS window attached to the tmux fixture.
  .extend("kitty", { scope: "worker" }, async ({ tmux }) => {
    return getOrCreateKittyInstance(tmux);
  });
