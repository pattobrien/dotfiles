import { z } from "zod/v4";

const SessionSchema = z.object({
  name: z.string(),
  attached: z.boolean(),
});

export type TmuxSession = z.infer<typeof SessionSchema>;

function run(args: string[]): { exitCode: number; stdout: string } {
  const proc = Bun.spawnSync(["tmux", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: proc.exitCode,
    stdout: proc.stdout.toString().trim(),
  };
}

function runInherit(args: string[]): void {
  Bun.spawnSync(["tmux", ...args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
}

export function listSessions(): TmuxSession[] {
  const { exitCode, stdout } = run([
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

export function getActiveSession(): string | null {
  if (!process.env.TMUX) return null;
  const { exitCode, stdout } = run(["display-message", "-p", "#S"]);
  return exitCode === 0 ? stdout : null;
}

export function hasSession(name: string): boolean {
  return run(["has-session", `-t=${name}`]).exitCode === 0;
}

export function newSession(name: string, cwd?: string): void {
  const args = ["new-session", "-d", "-s", name];
  if (cwd) args.push("-c", cwd);
  run(args);
}

export function killSession(name: string): void {
  run(["kill-session", "-t", name]);
}

export function switchClient(name: string): void {
  runInherit(["switch-client", "-t", name]);
}

export function attachSession(name: string): void {
  runInherit(["attach-session", "-t", name]);
}

export function switchOrAttach(name: string): void {
  if (process.env.TMUX) {
    switchClient(name);
  } else {
    attachSession(name);
  }
}

export function sendKeys(target: string, ...keys: string[]): void {
  run(["send-keys", "-t", target, ...keys]);
}
