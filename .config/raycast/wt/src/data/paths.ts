import { cpus } from "node:os";

const isAppleSilicon = cpus()[0].model.includes("Apple");

export const GIT_BIN = "/usr/bin/git";
export const TMUX_BIN = isAppleSilicon
  ? "/opt/homebrew/bin/tmux"
  : "/usr/local/bin/tmux";
export const WT_BIN = "/Users/pattobrien/.local/bin/wt";

// PATH for wt subprocesses — wt uses #!/usr/bin/env bun (needs mise shims)
// and internally spawns git, tmux, etc.
export const WT_PATH = [
  "/Users/pattobrien/.local/share/mise/shims",
  "/Users/pattobrien/.local/bin",
  isAppleSilicon ? "/opt/homebrew/bin" : "/usr/local/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
].join(":");

// Raycast sets TMPDIR to a per-app sandbox dir, but the tmux server socket
// lives under /tmp (macOS symlink to /private/tmp). Override so tmux can
// find the running server.
export const TMUX_TMPDIR = "/tmp";

export const DEFAULT_CWD = "~/dev/getdots/meagain-bare/.worktrees/main";

export const PROJECTS_CACHE_PATH = resolvePath("~/.cache/wt/projects.json");

export function resolvePath(path: string): string {
  return path.replace(/^~/, process.env.HOME || "/Users/pattobrien");
}
