import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  recordArtifact,
  test as base,
  type FailureScreenshotArtifact,
  type TestArtifactBase,
  type TestAttachment,
} from "vite-plus/test";

import { createHerdrSession, type HerdrTestSession } from "../src/herdr.ts";
import { createKittyInstance } from "../src/kitty.ts";
import { launchNvimInstance, type NvimInstance } from "../src/nvim.ts";
import { createTmuxSession } from "../src/tmux.ts";

/**
 * Terminal-session recording artifact. A custom registered type (the
 * `package:name` pattern; `internal:` is reserved) because no annotation
 * can carry the recording: `annotate()` requires the "run" state, which is
 * already over at every point where the .cast exists (fixture cleanup,
 * onTestFailed, aroundEach teardown), and worker-side `recordArtifact`
 * silently drops `internal:annotation` artifacts. The server still resolves
 * attachments for custom artifacts — the .cast is copied into
 * .vitest/attachments and lands in the report data.
 */
interface RecordingArtifact extends TestArtifactBase {
  type: "e2e:recording";
  attachments: [TestAttachment];
}

const recordingArtifactKey = Symbol("e2e-recording");

declare module "vitest" {
  interface TestArtifactRegistry {
    [recordingArtifactKey]: RecordingArtifact;
  }
}

async function attachRecording(task: Parameters<typeof recordArtifact>[0], cast: string | null) {
  if (cast === null) return;
  await recordArtifact(task, {
    type: "e2e:recording",
    attachments: [{ contentType: "application/x-asciicast", path: cast }],
  } satisfies RecordingArtifact);
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
  .extend("nvim", async ({ rawNvim, task }, { onCleanup }) => {
    const safeName = task.name.replace(/[^a-zA-Z0-9-_]/g, "_");
    // Each test file runs in its own isolated worker (one nvim per file) —
    // name the recording after the file so runs don't overwrite each other.
    const fileName = task.file.name
      .split("/")
      .pop()
      ?.replace(/\.test\.ts$/, "");
    if (fileName) rawNvim.term.relabel(fileName);
    await resetAndAssert(rawNvim, "BEFORE", safeName);

    onCleanup(async () => {
      // Capture before the AFTER reset wipes the screen — cleanup runs ahead
      // of onTestFailed here, so this is the only ordering-safe spot.
      // Path-based attachment with originalPath, matching vitest's own
      // browser-mode producer — the terminal reporter prints
      // attachments[0].originalPath under the failure.
      if (task.result?.state === "fail") {
        const dir = path.resolve(import.meta.dirname, "../test-results/failures");
        mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${safeName}.svg`);
        writeFileSync(file, rawNvim.term.term.screenshotSvg());
        await recordArtifact(task, {
          type: "internal:failureScreenshot",
          attachments: [{ contentType: "image/svg+xml", path: file, originalPath: file }],
        } satisfies FailureScreenshotArtifact);
      }
      // The worker's recording grows across the file's tests; each test
      // re-saves and attaches the same per-file .cast.
      await attachRecording(task, rawNvim.term.save());
      await resetAndAssert(rawNvim, "AFTER");
    });

    return rawNvim;
  })

  // Test-scoped: isolated herdr server + SDK client + attached emulator.
  .extend("herdr", async ({ task }, { onCleanup }): Promise<HerdrTestSession> => {
    const session = await createHerdrSession({ label: `herdr ${task.name}` });
    onCleanup(async () => {
      await attachRecording(task, session.term.save());
      await session.dispose();
    });
    return session;
  })

  // Worker-scoped: real kitty OS window attached to the tmux fixture.
  .extend("kitty", { scope: "worker" }, async ({ tmux }) => {
    return createKittyInstance(tmux);
  });
