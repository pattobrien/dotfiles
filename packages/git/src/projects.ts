import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

import type { Project } from "./models";

const DEFAULT_DIRS = [join(homedir(), "dev")];

function fdFind(
  pattern: string,
  type: "d" | "f",
  baseDirs: string[],
  maxDepth = 4,
): string[] {
  try {
    const output = execFileSync(
      "fd",
      ["-H", "-t", type, pattern, ...baseDirs, "--max-depth", String(maxDepth)],
      {
        encoding: "utf-8",
        timeout: 30_000,
      },
    ).trim();
    return output ? output.split("\n") : [];
  } catch {
    return [];
  }
}

export function discoverProjects(baseDirs = DEFAULT_DIRS): Project[] {
  const barePaths = fdFind("^\\.bare$", "d", baseDirs);
  const gitDirPaths = fdFind("^\\.git$", "d", baseDirs);

  const projects = new Map<string, Project>();

  for (const barePath of barePaths) {
    const repoDir = dirname(barePath);
    const rawName = basename(repoDir);
    const repoName = rawName.replace(/-bare$/, "");
    const repoOrg = basename(dirname(repoDir));

    projects.set(repoDir, { repoDir, repoName, repoOrg, isBare: true });
  }

  for (const gitPath of gitDirPaths) {
    const repoDir = dirname(gitPath);

    // Skip .worktrees subdirectories — those are worktree checkouts, not standalone repos
    if (repoDir.includes("/.worktrees/")) continue;

    // Skip if this is inside a bare repo structure (sibling to .bare)
    const parentBare = join(dirname(repoDir), ".bare");
    if (existsSync(parentBare)) continue;

    // Skip if a bare variant already registered
    const repoName = basename(repoDir).replace(/-bare$/, "");
    const alreadyBare = [...projects.values()].some(
      (p) => p.repoName === repoName && p.isBare,
    );
    if (alreadyBare) continue;

    const repoOrg = basename(dirname(repoDir));

    projects.set(repoDir, { repoDir, repoName, repoOrg, isBare: false });
  }

  return [...projects.values()].toSorted((a, b) => {
    const orgCmp = a.repoOrg.localeCompare(b.repoOrg);
    if (orgCmp !== 0) return orgCmp;
    return a.repoName.localeCompare(b.repoName);
  });
}
