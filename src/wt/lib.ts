import { basename, resolve } from "path";

import { $ } from "bun";

export interface RepoInfo {
  repoRoot: string;
  repoName: string;
  isBare: boolean;
}

export interface Worktree {
  path: string;
  name: string;
}

export async function getRepoInfo(): Promise<RepoInfo> {
  try {
    const gitDir = (await $`git rev-parse --git-dir`.text()).trim();
    const isBare =
      (await $`git rev-parse --is-bare-repository`.text()).trim() === "true";

    const repoRoot = isBare
      ? resolve(gitDir)
      : (await $`git rev-parse --show-toplevel`.text()).trim();

    const repoName = basename(repoRoot).replace(/-bare$/, "");

    return { repoRoot, repoName, isBare };
  } catch {
    console.error("Error: not in a git repository");
    process.exit(1);
  }
}

export async function listWorktrees(): Promise<Worktree[]> {
  const output = await $`git worktree list --porcelain`.text();
  const worktrees: Worktree[] = [];

  for (const line of output.split("\n")) {
    if (line.startsWith("worktree ")) {
      const path = line.slice("worktree ".length);
      worktrees.push({ path, name: basename(path) });
    }
  }

  return worktrees;
}

export function deriveSessionName(
  repoName: string,
  worktreeName: string,
): string {
  return `${repoName}--${worktreeName}`.replace(/[.:]/g, "-");
}

export async function fzfSelect(
  items: Array<{ label: string; value: string }>,
  prompt: string,
): Promise<string | null> {
  const input = items.map((item) => `${item.label}\t${item.value}`).join("\n");

  const proc = Bun.spawn(
    [
      "fzf",
      "--reverse",
      `--prompt=${prompt}`,
      "--with-nth=1",
      "--delimiter=\t",
    ],
    {
      stdin: new Response(input),
      stdout: "pipe",
      stderr: "inherit",
    },
  );

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) return null;

  const parts = output.trim().split("\t");
  return parts[1] || parts[0];
}
