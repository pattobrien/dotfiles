import xterm from "@xterm/headless";
import { spawn as ptySpawn } from "node-pty";

import { pollFor, type TermBackend, type TermLaunchOptions, type TermSession } from "./backend.ts";

/** Minimal named-key → escape-sequence map (extend as tests need keys). */
const KEYS: Record<string, string> = {
  Enter: "\r",
  Escape: "\x1b",
  Tab: "\t",
  Backspace: "\x7f",
  ArrowUp: "\x1b[A",
  ArrowDown: "\x1b[B",
  ArrowRight: "\x1b[C",
  ArrowLeft: "\x1b[D",
};

/**
 * xterm.js fallback backend: node-pty PTY piped into @xterm/headless.
 * Covers launch/output/input/resize; mouse input is not implemented
 * (Termless carries the behavior tier — this backend exists as the
 * swap-path insurance, kept honest by the conformance smoke test).
 */
export function createXtermBackend(): TermBackend {
  return {
    name: "xterm",

    async launch(command, options: TermLaunchOptions = {}) {
      const cols = options.cols ?? 200;
      // Mutable: resize() updates it so screen reads cover newly exposed rows.
      let rows = options.rows ?? 50;
      const [file, ...args] = command;
      if (!file) throw new Error("launch: empty command");

      const term = new xterm.Terminal({ cols, rows, allowProposedApi: true });
      let rawOutput = "";
      let exited = false;

      const pty = ptySpawn(file, args, {
        name: "xterm-256color",
        cols,
        rows,
        // Match Termless's env semantics (overrides merged over process.env).
        env: { ...(process.env as Record<string, string>), ...options.env },
        cwd: options.cwd ?? process.cwd(),
      });
      pty.onData((data) => {
        rawOutput += data;
        term.write(data);
      });
      pty.onExit(() => {
        exited = true;
      });

      const screenText = () => {
        const buf = term.buffer.active;
        const lines: string[] = [];
        for (let y = 0; y < rows; y++) {
          const line = buf.getLine(buf.baseY + y);
          lines.push(line ? line.translateToString(true) : "");
        }
        return lines.join("\n");
      };

      const session: TermSession = {
        text: screenText,
        raw: () => rawOutput,
        type: (text) => pty.write(text),
        press: (key) => {
          const seq = KEYS[key];
          if (!seq) throw new Error(`xterm backend: unmapped key "${key}"`);
          pty.write(seq);
        },
        click: () => {
          throw new Error("xterm backend: mouse input not implemented");
        },
        async waitFor(pattern, timeoutMs = 5_000) {
          const re =
            typeof pattern === "string"
              ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              : pattern;
          await pollFor(() => re.test(screenText()), `screen to match ${re}`, timeoutMs);
        },
        resize: (newCols, newRows) => {
          pty.resize(newCols, newRows);
          term.resize(newCols, newRows);
          rows = newRows;
        },
        get alive() {
          return !exited;
        },
        async dispose() {
          pty.kill();
          term.dispose();
        },
      };
      return session;
    },
  };
}
