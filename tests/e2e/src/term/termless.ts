import { createTerminal } from "@termless/core";
import type { TerminalBackend, TestTerminal } from "@termless/core";
import { resolve as resolveGhostty } from "@termless/ghostty";

import { SessionRecorder } from "../recording.ts";
import { pollFor, type TermBackend, type TermLaunchOptions, type TermSession } from "./backend.ts";

export interface TermlessSession extends TermSession {
  /** The underlying Termless terminal, for matchers and region selectors. */
  readonly term: TestTerminal;
  /** Drop a named marker into this session's recording. */
  mark(label: string): void;
  /**
   * Rename the session's recording (worker-scoped sessions only learn
   * which test file they serve once the first test runs).
   */
  relabel(label: string): void;
}

// Direct factory imports instead of core's backend-name registry: the
// published 0.8.4 dist mis-resolves its backends.json path (PACKAGE_ROOT
// points at the @termless scope dir), so backend("ghostty") throws ENOENT.
const FACTORIES: Record<string, () => Promise<TerminalBackend>> = {
  ghostty: () => resolveGhostty(),
};

/** Per-process label dedupe so parallel sessions don't overwrite recordings. */
const labelCounts = new Map<string, number>();
function uniqueLabel(label: string): string {
  const count = (labelCounts.get(label) ?? 0) + 1;
  labelCounts.set(label, count);
  return count === 1 ? label : `${label}-${count}`;
}

/**
 * Termless-backed sessions (default). The VT parser is Termless's ghostty
 * backend (WASM); the spawned process runs under a real node-pty PTY.
 * Every session is recorded as an asciicast under test-results/recordings/.
 */
export function createTermlessBackend(backendName = "ghostty"): TermBackend & {
  launch(command: string[], options?: TermLaunchOptions): Promise<TermlessSession>;
} {
  return {
    name: `termless:${backendName}`,

    async launch(command, options = {}) {
      const factory = FACTORIES[backendName];
      if (!factory) throw new Error(`no factory registered for backend "${backendName}"`);
      const b = await factory();
      const cols = options.cols ?? 200;
      const rows = options.rows ?? 50;
      const recorder = new SessionRecorder(
        uniqueLabel(options.label ?? command[0] ?? backendName),
        cols,
        rows,
      );
      const term = createTerminal({
        backend: b,
        cols,
        rows,
        onAfterWrite: (data) => recorder.onOutput(data),
      });
      // Termless merges process.env under this internally, so env vars can
      // only be overridden, never removed here — vars that must not reach
      // spawned processes are deleted from process.env in tests/setup.ts.
      await term.spawn(command, {
        env: options.env,
        cwd: options.cwd,
      });

      return {
        term,
        mark: (label) => recorder.mark(label),
        // Exact assignment, no uniquifying: relabel targets are already
        // unique (one worker per test file), and watch-mode reruns should
        // overwrite the previous run's recording, not accumulate suffixes.
        relabel: (label) => {
          recorder.label = label;
        },
        text: () => term.screen.getText(),
        raw: () => term.output.getText(),
        type: (text) => term.type(text),
        press: (key) => term.press(key),
        click: (col, row) => term.click(col, row),
        async waitFor(pattern, timeoutMs = 5_000) {
          if (typeof pattern === "string") {
            await term.waitFor(pattern, timeoutMs);
            return;
          }
          await pollFor(
            () => pattern.test(term.screen.getText()),
            `screen to match ${pattern}`,
            timeoutMs,
          );
        },
        resize: (cols2, rows2) => {
          recorder.onResize(cols2, rows2);
          term.resize(cols2, rows2);
        },
        get alive() {
          return term.alive;
        },
        async dispose() {
          recorder.save();
          await term.close();
        },
      };
    },
  };
}
