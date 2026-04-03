import { execaCommand, execa } from "execa";

const TMUX_SOCKET = "e2e-test";
const TMUX_SESSION = "e2e";

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
  /** Wait for a regex pattern to appear in the pane. */
  waitForText: (pattern: string, timeoutSecs?: number) => Promise<void>;
  /** Run a tmux command on this session (e.g., "split-window -h"). */
  runCommand: (...args: string[]) => Promise<string>;
  /** List key bindings for a key table (e.g., "prefix", "root", "copy-mode-vi"). */
  listKeys: (table?: string) => Promise<string>;
}

function buildSession(socket: string, session: string): TmuxSession {
  return {
    socket,
    session,

    async sendKeys(...keys: string[]) {
      await execa("tmux", ["-L", socket, "send-keys", "-t", session, ...keys]);
    },

    async capture() {
      const { stdout } = await execaCommand(
        `tmux -L ${socket} capture-pane -t ${session} -p`,
      );
      return stdout;
    },

    async waitForText(pattern: string, timeoutSecs = 10) {
      const deadline = Date.now() + timeoutSecs * 1000;
      const re = new RegExp(pattern);
      while (Date.now() < deadline) {
        const { stdout } = await execaCommand(
          `tmux -L ${socket} capture-pane -t ${session} -p`,
        );
        if (re.test(stdout)) return;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error(
        `Timed out after ${timeoutSecs}s waiting for: ${pattern}`,
      );
    },

    async runCommand(...args: string[]) {
      const { stdout } = await execa("tmux", [
        "-L",
        socket,
        ...args,
        "-t",
        session,
      ]);
      return stdout;
    },

    async listKeys(table?: string) {
      const args = ["-L", socket, "list-keys"];
      if (table) args.push("-T", table);
      const { stdout } = await execa("tmux", args);
      return stdout;
    },
  };
}

/** Check if the persistent tmux server + session already exist. */
async function tmuxSessionExists(): Promise<boolean> {
  try {
    await execa("tmux", ["-L", TMUX_SOCKET, "has-session", "-t", TMUX_SESSION]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get or create the persistent tmux session.
 * On first run: starts server + session (~400ms). On subsequent runs: instant.
 * The session is intentionally left alive after tests finish.
 */
export async function getOrCreateTmuxSession(): Promise<TmuxSession> {
  if (await tmuxSessionExists()) {
    return buildSession(TMUX_SOCKET, TMUX_SESSION);
  }

  const tmuxConf = `${process.env.HOME}/.tmux.conf`;
  await execa("tmux", [
    "-L",
    TMUX_SOCKET,
    "-f",
    tmuxConf,
    "new-session",
    "-d",
    "-s",
    TMUX_SESSION,
    "-x",
    "200",
    "-y",
    "50",
  ]);

  return buildSession(TMUX_SOCKET, TMUX_SESSION);
}

/** Kill a tmux session (for test cleanup when isolation is needed). */
export async function killTmuxSession(socket: string, session: string) {
  await execaCommand(`tmux -L ${socket} kill-session -t ${session}`).catch(
    () => {},
  );
}
