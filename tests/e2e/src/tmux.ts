import { execaCommand, execa } from "execa";

export interface TmuxSession {
  /** The tmux server socket name (shared per file). */
  socket: string;
  /** The tmux session name (unique per test). */
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

/** Create a new tmux server socket. Call `kill()` to tear it down. */
export async function createTmuxServer(socket: string) {
  return {
    socket,
    async kill() {
      await execaCommand(`tmux -L ${socket} kill-server`).catch(() => { });
    },
  };
}

/** Create a new tmux session on the given server socket. */
export async function createTmuxSession(
  socket: string,
  session: string,
): Promise<TmuxSession> {
  const tmuxConf = `${process.env.HOME}/.tmux.conf`;
  await execaCommand(
    `tmux -L ${socket} -f ${tmuxConf} new-session -d -s ${session} -x 200 -y 50`,
  );

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

/** Kill a tmux session. */
export async function killTmuxSession(socket: string, session: string) {
  await execaCommand(`tmux -L ${socket} kill-session -t ${session}`).catch(
    () => { },
  );
}
