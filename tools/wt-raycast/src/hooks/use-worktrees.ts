import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";

import { GitClient } from "git";
import { TmuxClient } from "tmux";
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
  WorktreeItemSchema,
  type WorktreeItem,
} from "../models";

const BRANCH_REF_PREFIX = "refs/heads/";

function stripBranchRef(branch: string): string {
  return branch.startsWith(BRANCH_REF_PREFIX)
    ? branch.slice(BRANCH_REF_PREFIX.length)
    : branch;
}

function deriveSessionName(repoName: string, wtName: string): string {
  return `${repoName}--${wtName}`.replace(/[.:]/g, "-");
}

/**
 * For bare repos, the project repoDir contains `.bare` but no `.git`,
 * so git commands can't run there directly. Find a worktree checkout to use as cwd.
 */
function resolveGitCwd(dir: string): string {
  if (existsSync(join(dir, ".git"))) return dir;

  if (existsSync(join(dir, ".bare"))) {
    const searchDirs = [dir];
    const wtDir = join(dir, ".worktrees");
    if (existsSync(wtDir)) searchDirs.push(wtDir);

    for (const searchDir of searchDirs) {
      try {
        for (const entry of readdirSync(searchDir)) {
          if (entry.startsWith(".")) continue;
          const full = join(searchDir, entry);
          if (statSync(full).isDirectory() && existsSync(join(full, ".git"))) {
            return full;
          }
        }
      } catch {
        // skip
      }
    }
  }

  return dir;
}

async function fetchWorktreeItems(cwd: string): Promise<WorktreeItem[]> {
  const gitClient = await GitClient.create({ cwd, binary: GIT_BIN });
  const tmuxClient = new TmuxClient({ bin: TMUX_BIN, env: { TMUX_TMPDIR } });

  const worktrees = await gitClient.listWorktrees();

  const sessions = tmuxClient.listSessions();
  const sessionMap = new Map<string, SessionStatus>();
  for (const s of sessions) {
    sessionMap.set(s.name, s.attached ? SessionStatus.Active : SessionStatus.Detached);
  }

  const statusOrder = {
    [SessionStatus.Active]: 0,
    [SessionStatus.Detached]: 1,
    [SessionStatus.None]: 2,
  };

  return worktrees
    .map((wt) => {
      const name = basename(wt.path);
      const sessionName = deriveSessionName(gitClient.repoName, name);
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
  const resolvedCwd = resolveGitCwd(resolvePath(cwd || DEFAULT_CWD));
  return useCachedPromise(
    (dir: string) => fetchWorktreeItems(dir),
    [resolvedCwd],
  );
}
