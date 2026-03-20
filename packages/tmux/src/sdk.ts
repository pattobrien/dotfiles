import { spawnSync } from "node:child_process";

import { SessionSchema, WindowSchema, type TmuxSession, type TmuxWindow } from "./models";

// Literal delimiter for tmux -F format strings. Avoids \t which tmux only
// interprets as a tab when TERM is set (not the case in sandboxed environments
// like Raycast).
const SEP = "|||";

export interface TmuxClientOptions {
  bin?: string;
  env?: Record<string, string>;
}

export class TmuxClient {
  private readonly bin: string;
  private readonly env: Record<string, string> | undefined;

  constructor(opts?: TmuxClientOptions) {
    this.bin = opts?.bin ?? "tmux";
    this.env = opts?.env;
  }

  private run(args: string[]): { exitCode: number; stdout: string } {
    const proc = spawnSync(this.bin, args, {
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf-8",
      env: this.env ? { ...process.env, ...this.env } : undefined,
    });
    return {
      exitCode: proc.status ?? 1,
      stdout: (proc.stdout ?? "").trim(),
    };
  }

  private runInherit(args: string[]): void {
    spawnSync(this.bin, args, {
      stdio: "inherit",
      env: this.env ? { ...process.env, ...this.env } : undefined,
    });
  }

  listSessions(): TmuxSession[] {
    const { exitCode, stdout } = this.run([
      "list-sessions",
      "-F",
      `#{session_name}${SEP}#{session_path}${SEP}#{session_attached}${SEP}#{session_activity}`,
    ]);
    if (exitCode !== 0) return [];

    return stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name, path, attached, activity] = line.split(SEP);
        return SessionSchema.parse({
          name,
          path,
          attached: attached === "1",
          lastActivity: Number(activity) || 0,
        });
      });
  }

  getSessionByPath(path: string): TmuxSession | null {
    return this.listSessions().find((s) => s.path === path) ?? null;
  }

  getActiveSession(): string | null {
    if (!process.env.TMUX) return null;
    const { exitCode, stdout } = this.run(["display-message", "-p", "#S"]);
    return exitCode === 0 ? stdout : null;
  }

  hasSession(opts: { name: string }): boolean {
    return this.run(["has-session", `-t=${opts.name}`]).exitCode === 0;
  }

  newSession(opts: { name: string; cwd?: string }): void {
    const args = ["new-session", "-d", "-s", opts.name];
    if (opts.cwd) args.push("-c", opts.cwd);
    this.run(args);
  }

  killSession(opts: { name: string }): void {
    this.run(["kill-session", "-t", opts.name]);
  }

  switchClient(opts: { name: string }): void {
    this.runInherit(["switch-client", "-t", opts.name]);
  }

  attachSession(opts: { name: string }): void {
    this.runInherit(["attach-session", "-t", opts.name]);
  }

  switchOrAttach(opts: { name: string }): void {
    if (process.env.TMUX) {
      this.switchClient(opts);
    } else {
      this.attachSession(opts);
    }
  }

  sendKeys(opts: { target: string; keys: string[] }): void {
    this.run(["send-keys", "-t", opts.target, ...opts.keys]);
  }

  newWindow(opts: { target: string; name?: string; cwd?: string; cmd?: string }): void {
    const args = ["new-window", "-t", opts.target];
    if (opts.name) args.push("-n", opts.name);
    if (opts.cwd) args.push("-c", opts.cwd);
    if (opts.cmd) args.push(opts.cmd);
    this.run(args);
  }

  renameWindow(opts: { target: string; name: string }): void {
    this.run(["rename-window", "-t", opts.target, opts.name]);
  }

  listWindows(opts?: { target?: string }): TmuxWindow[] {
    const args = ["list-windows", "-F", `#{session_name}${SEP}#{window_index}${SEP}#{window_name}${SEP}#{pane_current_command}${SEP}#{pane_pid}`];
    if (opts?.target) {
      args.push("-t", opts.target);
    } else {
      args.push("-a");
    }

    const { exitCode, stdout } = this.run(args);
    if (exitCode !== 0) return [];

    return stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [sessionName, windowIndex, windowName, paneCurrentCommand, panePid] = line.split(SEP);
        return WindowSchema.parse({
          sessionName,
          windowIndex,
          windowName,
          paneCurrentCommand,
          panePid: Number(panePid) || 0,
        });
      });
  }
}
