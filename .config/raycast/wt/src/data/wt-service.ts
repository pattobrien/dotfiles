import { execSync } from "node:child_process";
import { basename, dirname } from "node:path";

import {
  SessionStatus,
  TmuxSessionSchema,
  WorktreeItemSchema,
  WorktreeSchema,
  type TmuxSession,
  type Worktree,
  type WorktreeItem,
} from "../models";
import { DEFAULT_CWD, GIT_BIN, TMUX_BIN, WT_BIN, WT_PATH, resolvePath } from "./paths";

const BRANCH_REF_PREFIX = "refs/heads/";

function exec(file: string, args: string[], cwd: string): string {
  return execSync([file, ...args].join(" "), {
    cwd,
    encoding: "utf-8",
    timeout: 10_000,
  }).trim();
}

function resolveCwd(cwd?: string): string {
  return resolvePath(cwd || DEFAULT_CWD);
}

function getRepoRoot(cwd: string): { repoRoot: string; repoName: string } {
  const commonDir = exec(GIT_BIN, ["rev-parse", "--git-common-dir"], cwd);
  const isBare = commonDir.endsWith("/.bare");

  let repoRoot: string;
  if (isBare) {
    repoRoot = dirname(commonDir);
  } else {
    repoRoot = exec(GIT_BIN, ["rev-parse", "--show-toplevel"], cwd);
  }

  const repoName = basename(repoRoot).replace(/-bare$/, "");
  return { repoRoot, repoName };
}

function deriveSessionName(repoName: string, wtName: string): string {
  return `${repoName}--${wtName}`.replace(/[.:]/g, "-");
}

function stripBranchRef(branch: string): string {
  if (branch.startsWith(BRANCH_REF_PREFIX)) {
    return branch.slice(BRANCH_REF_PREFIX.length);
  }
  return branch;
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
      TMUX_BIN,
      ["list-sessions", "-F", '"#{session_name}\t#{session_attached}"'],
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
  const raw = exec(GIT_BIN, ["worktree", "list", "--porcelain"], repoRoot);
  const worktrees = parseWorktrees(raw);
  const sessions = listTmuxSessions();
  const sessionMap = new Map(
    sessions.map((s) => [
      s.name,
      s.attached ? SessionStatus.Active : SessionStatus.Detached,
    ]),
  );

  return worktrees.map((wt) => {
    const name = basename(wt.path);
    const sessionName = deriveSessionName(repoName, name);
    const sessionStatus = sessionMap.get(sessionName) ?? SessionStatus.None;

    return WorktreeItemSchema.parse({
      name,
      path: wt.path,
      branch: wt.branch,
      displayBranch: wt.branch ? stripBranchRef(wt.branch) : undefined,
      head: wt.head,
      sessionStatus,
    });
  });
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
