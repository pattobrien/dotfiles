import { execFileSync, execSync } from "node:child_process";

import { DEFAULT_CWD, TMUX_BIN, TMUX_TMPDIR, WT_BIN, WT_PATH, resolvePath } from "./paths";

function resolveCwd(cwd?: string): string {
  return resolvePath(cwd || DEFAULT_CWD);
}

function execWt(args: string[], cwd: string): void {
  execSync([WT_BIN, ...args].join(" "), {
    cwd,
    encoding: "utf-8",
    timeout: 15_000,
    env: { ...process.env, PATH: WT_PATH },
  });
}

export function attachWorktree(name: string, cwd?: string): void {
  execWt(["attach", name], resolveCwd(cwd));
}

export function switchWorktree(sessionName: string): void {
  // Switch the tmux client to the target session
  execFileSync(TMUX_BIN, ["switch-client", "-t", sessionName], {
    encoding: "utf-8",
    timeout: 10_000,
    env: { ...process.env, TMUX_TMPDIR },
  });

  // Bring kitty to the foreground without opening a new window
  execSync(`osascript -e 'tell application "kitty" to activate'`, { timeout: 5_000 });
}

export function removeWorktree(name: string, cwd?: string): void {
  execWt(["remove", name], resolveCwd(cwd));
}
