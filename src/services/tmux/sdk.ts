import { SessionSchema, type TmuxSession } from "./models";

export class TmuxClient {
  private run(args: string[]): { exitCode: number; stdout: string } {
    const proc = Bun.spawnSync(["tmux", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });
    return {
      exitCode: proc.exitCode,
      stdout: proc.stdout.toString().trim(),
    };
  }

  private runInherit(args: string[]): void {
    Bun.spawnSync(["tmux", ...args], {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
  }

  listSessions(): TmuxSession[] {
    const { exitCode, stdout } = this.run([
      "list-sessions",
      "-F",
      "#{session_name}\t#{session_attached}",
    ]);
    if (exitCode !== 0) return [];

    return stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name, attached] = line.split("\t");
        return SessionSchema.parse({ name, attached: attached === "1" });
      });
  }

  getActiveSession(): string | null {
    if (!process.env.TMUX) return null;
    const { exitCode, stdout } = this.run(["display-message", "-p", "#S"]);
    return exitCode === 0 ? stdout : null;
  }

  hasSession(name: string): boolean {
    return this.run(["has-session", `-t=${name}`]).exitCode === 0;
  }

  newSession(name: string, cwd?: string): void {
    const args = ["new-session", "-d", "-s", name];
    if (cwd) args.push("-c", cwd);
    this.run(args);
  }

  killSession(name: string): void {
    this.run(["kill-session", "-t", name]);
  }

  switchClient(name: string): void {
    this.runInherit(["switch-client", "-t", name]);
  }

  attachSession(name: string): void {
    this.runInherit(["attach-session", "-t", name]);
  }

  switchOrAttach(name: string): void {
    if (process.env.TMUX) {
      this.switchClient(name);
    } else {
      this.attachSession(name);
    }
  }

  sendKeys(target: string, ...keys: string[]): void {
    this.run(["send-keys", "-t", target, ...keys]);
  }
}
