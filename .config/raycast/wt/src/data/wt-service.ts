import { execSync } from "node:child_process";

import { DEFAULT_CWD, WT_BIN, WT_PATH, resolvePath } from "./paths";

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

export function removeWorktree(name: string, cwd?: string): void {
  execWt(["remove", name], resolveCwd(cwd));
}
