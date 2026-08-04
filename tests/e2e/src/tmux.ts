import { execa, execaCommand } from "execa";

import { createTermlessBackend } from "./term/termless.ts";
import type { TermlessSession } from "./term/termless.ts";

export interface TmuxSession {
  socket: string;
  session: string;

  /**
   * Send keys to the program running in the pane.
   * NOTE: This bypasses tmux key bindings entirely — keys go to the shell/program.
   * To test tmux bindings, use `runCommand()` or `listKeys()`.
   */
  sendKeys: (...keys: string[]) => Promise<void>;
  /** Capture the current pane content as text. */
  capture: () => Promise<string>;
  /** Capture the current pane content including escape sequences (-e). */
  captureRaw: () => Promise<string>;
  /** Wait for a regex pattern to appear in the pane. */
  waitForText: (pattern: string, timeoutSecs?: number) => Promise<void>;
  /** Run a tmux command on this session (e.g., "split-window -h"). */
  runCommand: (...args: string[]) => Promise<string>;
  /** List key bindings for a key table (e.g., "prefix", "root", "copy-mode-vi"). */
  listKeys: (table?: string) => Promise<string>;
  /**
   * Attach an emulator client to this session (tmux as system under test,
   * emulator as data plane for rendering asserts).
   */
  attachTerm: (opts?: { cols?: number; rows?: number }) => Promise<TermlessSession>;
  /** Kill the tmux server (and any emulator clients attached to it). */
  dispose: () => Promise<void>;
}

function buildSession(socket: string, session: string): TmuxSession {
  const attached: TermlessSession[] = [];

  return {
    socket,
    session,

    async sendKeys(...keys: string[]) {
      await execa("tmux", ["-L", socket, "send-keys", "-t", session, ...keys]);
    },

    async capture() {
      const { stdout } = await execaCommand(`tmux -L ${socket} capture-pane -t ${session} -p`);
      return stdout;
    },

    async captureRaw() {
      const { stdout } = await execaCommand(`tmux -L ${socket} capture-pane -t ${session} -pe`);
      return stdout;
    },

    async waitForText(pattern: string, timeoutSecs = 10) {
      const deadline = Date.now() + timeoutSecs * 1000;
      const re = new RegExp(pattern);
      while (Date.now() < deadline) {
        const { stdout } = await execaCommand(`tmux -L ${socket} capture-pane -t ${session} -p`);
        if (re.test(stdout)) return;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error(`Timed out after ${timeoutSecs}s waiting for: ${pattern}`);
    },

    async runCommand(...args: string[]) {
      const { stdout } = await execa("tmux", ["-L", socket, ...args, "-t", session]);
      return stdout;
    },

    async listKeys(table?: string) {
      const args = ["-L", socket, "list-keys"];
      if (table) args.push("-T", table);
      const { stdout } = await execa("tmux", args);
      return stdout;
    },

    async attachTerm(opts = {}) {
      const term = (await createTermlessBackend().launch(
        ["tmux", "-L", socket, "attach-session", "-t", session],
        { cols: opts.cols ?? 200, rows: opts.rows ?? 50 },
      )) as TermlessSession;
      attached.push(term);
      return term;
    },

    async dispose() {
      for (const term of attached) {
        await term.dispose();
      }
      await execaCommand(`tmux -L ${socket} kill-server`);
    },
  };
}

/**
 * Start a fresh scoped tmux server + session for this test run (unique
 * socket per worker — never touches the user's real tmux server). Loads
 * the real ~/.tmux.conf: tests assert this dotfiles config.
 */
export async function createTmuxSession(): Promise<TmuxSession> {
  const socket = `e2e-${process.pid}`;
  const session = "e2e";
  const tmuxConf = `${process.env.HOME}/.tmux.conf`;

  await execa("tmux", [
    "-L",
    socket,
    "-f",
    tmuxConf,
    "new-session",
    "-d",
    "-s",
    session,
    "-x",
    "200",
    "-y",
    "50",
  ]);

  return buildSession(socket, session);
}
