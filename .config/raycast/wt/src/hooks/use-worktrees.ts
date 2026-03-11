import { execFileSync } from "node:child_process";
import { basename, dirname } from "node:path";

import { useCachedPromise } from "@raycast/utils";

import {
  DEFAULT_CWD,
  GIT_BIN,
  TMUX_BIN,
  TMUX_TMPDIR,
  resolvePath,
} from "../data/paths";
import {
  SessionStatus,
  TmuxSessionSchema,
  WorktreeItemSchema,
  WorktreeSchema,
  type WorktreeItem,
} from "../models";

const BRANCH_REF_PREFIX = "refs/heads/";
const SESSION_DELIM = ":::";

function stripBranchRef(branch: string): string {
  return branch.startsWith(BRANCH_REF_PREFIX)
    ? branch.slice(BRANCH_REF_PREFIX.length)
    : branch;
}

function deriveSessionName(repoName: string, wtName: string): string {
  return `${repoName}--${wtName}`.replace(/[.:]/g, "-");
}

function git(args: string[], cwd: string): string {
  return execFileSync(GIT_BIN, args, {
    cwd,
    encoding: "utf-8",
    timeout: 10_000,
  }).trim();
}

function listTmuxSessions(): Map<string, SessionStatus> {
  const map = new Map<string, SessionStatus>();
  try {
    const output = execFileSync(
      TMUX_BIN,
      ["list-sessions", "-F", `#{session_name}${SESSION_DELIM}#{session_attached}`],
      { cwd: "/", encoding: "utf-8", timeout: 10_000, env: { ...process.env, TMUX_TMPDIR } },
    ).trim();
    for (const line of output.split("\n").filter(Boolean)) {
      const idx = line.lastIndexOf(SESSION_DELIM);
      if (idx === -1) continue;
      const session = TmuxSessionSchema.parse({
        name: line.slice(0, idx),
        attached: line.slice(idx + SESSION_DELIM.length) === "1",
      });
      map.set(session.name, session.attached ? SessionStatus.Active : SessionStatus.Detached);
    }
  } catch {
    // tmux server not running — not an error for us
  }
  return map;
}

function fetchWorktreeItems(cwd: string): WorktreeItem[] {
  const commonDir = git(["rev-parse", "--git-common-dir"], cwd);
  const isBare = commonDir.endsWith("/.bare");
  const repoRoot = isBare
    ? dirname(commonDir)
    : git(["rev-parse", "--show-toplevel"], cwd);
  const repoName = basename(repoRoot).replace(/-bare$/, "");

  const raw = git(["worktree", "list", "--porcelain"], cwd);
  const worktrees = [];
  let current: Record<string, string | boolean> = {};

  for (const line of raw.split("\n")) {
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

  const sessionMap = listTmuxSessions();

  const statusOrder = {
    [SessionStatus.Active]: 0,
    [SessionStatus.Detached]: 1,
    [SessionStatus.None]: 2,
  };

  return worktrees
    .map((wt) => {
      const name = basename(wt.path);
      const sessionName = deriveSessionName(repoName, name);
      return WorktreeItemSchema.parse({
        name,
        path: wt.path,
        branch: wt.branch,
        displayBranch: wt.branch ? stripBranchRef(wt.branch) : undefined,
        head: wt.head,
        sessionName,
        sessionStatus: sessionMap.get(sessionName) ?? SessionStatus.None,
      });
    })
    .sort((a, b) => {
      const statusDiff = statusOrder[a.sessionStatus] - statusOrder[b.sessionStatus];
      if (statusDiff !== 0) return statusDiff;
      return a.name.localeCompare(b.name);
    });
}

export function useWorktrees(cwd?: string) {
  const resolvedCwd = resolvePath(cwd || DEFAULT_CWD);
  return useCachedPromise(() => Promise.resolve(fetchWorktreeItems(resolvedCwd)));
}
