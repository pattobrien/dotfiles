import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createRecording, createTerminal, encodeAsciicast, millisToMicros } from "@termless/core";
import type { IoEvent, TerminalBackend, TestTerminal } from "@termless/core";
import { resolve as resolveGhostty } from "@termless/ghostty";
import { resolve as resolveKitty } from "@termless/kitty";

import { pollFor, type TermBackend, type TermLaunchOptions, type TermSession } from "./backend.ts";

const RECORDINGS_DIR = path.resolve(import.meta.dirname, "../../test-results/recordings");

function sanitize(label: string): string {
  return label.replace(/[^a-zA-Z0-9-_.]/g, "_");
}

export interface TermlessSession extends TermSession {
  /** The underlying Termless terminal, for matchers and region selectors. */
  readonly term: TestTerminal;
  /** The recording label actually in use (uniquified on collision). */
  readonly label: string;
  /**
   * Write the session's .cast to disk (also happens on dispose) and return
   * its path, or null when the session produced no output.
   */
  save(): string | null;
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
  kitty: () => resolveKitty(),
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
 * Every session is captured as a Termless Recording (io track) and saved
 * as an asciicast under test-results/recordings/ via encodeAsciicast.
 */
export function createTermlessBackend(
  backendName = process.env.E2E_TERM_BACKEND ?? "ghostty",
): TermBackend & {
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
      let label = uniqueLabel(options.label ?? command[0] ?? backendName);
      const start = Date.now();
      const io: IoEvent[] = [];
      const decoder = new TextDecoder("utf-8");
      const term = createTerminal({
        backend: b,
        cols,
        rows,
        onAfterWrite: (data) => {
          io.push({
            at: millisToMicros(Date.now() - start),
            direction: "out",
            data: decoder.decode(data, { stream: true }),
          });
        },
      });
      const save = (): string | null => {
        if (io.length === 0) return null;
        mkdirSync(RECORDINGS_DIR, { recursive: true });
        const recording = createRecording({
          cols,
          rows,
          durationMicros: io[io.length - 1]!.at,
          io,
        });
        const file = path.join(RECORDINGS_DIR, `${sanitize(label)}.cast`);
        writeFileSync(
          file,
          encodeAsciicast(recording, { title: label, timestamp: Math.floor(start / 1000) }),
        );
        return file;
      };
      // Termless merges process.env under this internally, so env vars can
      // only be overridden, never removed here — vars that must not reach
      // spawned processes are deleted from process.env in tests/setup.ts.
      await term.spawn(command, {
        env: options.env,
        cwd: options.cwd,
      });

      return {
        term,
        get label() {
          return label;
        },
        // Exact assignment, no uniquifying: relabel targets are already
        // unique (one worker per test file), and watch-mode reruns should
        // overwrite the previous run's recording, not accumulate suffixes.
        relabel: (next) => {
          label = next;
        },
        save,
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
          term.resize(cols2, rows2);
        },
        get alive() {
          return term.alive;
        },
        async dispose() {
          save();
          await term.close();
        },
      };
    },
  };
}
