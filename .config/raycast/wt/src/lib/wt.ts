import { execSync } from "node:child_process";
import { basename, dirname } from "node:path";

import {
  TmuxSessionSchema,
  WorktreeItemSchema,
  WorktreeSchema,
  type TmuxSession,
  type Worktree,
  type WorktreeItem,
} from "./schemas";

const DEFAULT_CWD = "~/dev/getdots/meagain-bare/.worktrees/main";
const WT_BIN = "/Users/pattobrien/.local/bin/wt";
const SHELL_PATH =
  "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Users/pattobrien/.local/bin";

function resolveCwd(cwd?: string): string {
  const raw = cwd || DEFAULT_CWD;
  return raw.replace(/^~/, process.env.HOME || "/Users/pattobrien");
}

function exec(cmd: string, cwd: string): string {
  return execSync(cmd, {
    cwd,
    encoding: "utf-8",
    timeout: 10_000,
    env: { ...process.env, PATH: SHELL_PATH },
  }).trim();
}

function getRepoRoot(cwd: string): { repoRoot: string; repoName: string } {
  const commonDir = exec("git rev-parse --git-common-dir", cwd);
  const isBare = commonDir.endsWith("/.bare");

  let repoRoot: string;
  if (isBare) {
    repoRoot = dirname(commonDir);
  } else {
    repoRoot = exec("git rev-parse --show-toplevel", cwd);
  }

  const repoName = basename(repoRoot).replace(/-bare$/, "");
  return { repoRoot, repoName };
}

function deriveSessionName(repoName: string, wtName: string): string {
  return `${repoName}--${wtName}`.replace(/[.:]/g, "-");
}

function parseWorktrees(output: string): Worktree[] {
  const worktrees: Worktree[] = [];
  let current: Record<string, string | boolean> = {};

  for (const line of output.split("\n")) {
    if (line.startsWith("worktree ")) {
      current = { path: line.slice("worktree ".length) };
    } else if (line.startsWith("HEAD ")) {
      current.head = line.slice("HEAD ".length);
    } else if (line.startsWith("branch ")) {
      current.branch = line.slice("branch ".length);
    } else if (line === "bare") {
      current.bare = true;
    } else if (line === "" && current.path) {
      worktrees.push(
        WorktreeSchema.parse({
          ...current,
          head: current.head ?? "",
          bare: current.bare ?? false,
        }),
      );
      current = {};
    }
  }

  return worktrees;
}

function listTmuxSessions(): TmuxSession[] {
  try {
    const output = exec(
      'tmux list-sessions -F "#{session_name}\t#{session_attached}"',
      "/",
    );
    return output
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name, attached] = line.split("\t");
        return TmuxSessionSchema.parse({ name, attached: attached === "1" });
      });
  } catch {
    return [];
  }
}

export function listWorktreeItems(cwd?: string): WorktreeItem[] {
  const resolvedCwd = resolveCwd(cwd);
  const { repoRoot, repoName } = getRepoRoot(resolvedCwd);
  const raw = exec("git worktree list --porcelain", repoRoot);
  const worktrees = parseWorktrees(raw);
  const sessions = listTmuxSessions();
  const sessionMap = new Map(
    sessions.map((s) => [s.name, s.attached ? "active" : "detached"] as const),
  );

  return worktrees.map((wt) => {
    const name = basename(wt.path);
    const sessionName = deriveSessionName(repoName, name);
    const sessionStatus = sessionMap.get(sessionName) ?? "none";

    return WorktreeItemSchema.parse({
      name,
      path: wt.path,
      branch: wt.branch,
      head: wt.head,
      sessionStatus,
    });
  });
}

export function attachWorktree(name: string, cwd?: string): void {
  const resolvedCwd = resolveCwd(cwd);
  execSync(`${WT_BIN} attach ${name}`, {
    cwd: resolvedCwd,
    encoding: "utf-8",
    timeout: 15_000,
    env: { ...process.env, PATH: SHELL_PATH },
  });
}

export function removeWorktree(name: string, cwd?: string): void {
  const resolvedCwd = resolveCwd(cwd);
  execSync(`${WT_BIN} remove ${name}`, {
    cwd: resolvedCwd,
    encoding: "utf-8",
    timeout: 15_000,
    env: { ...process.env, PATH: SHELL_PATH },
  });
}
