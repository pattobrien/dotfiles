import { basename, dirname } from "path";
import simpleGit, { type SimpleGit } from "simple-git";

export interface RepoInfo {
  git: SimpleGit;
  repoRoot: string;
  repoName: string;
  isBare: boolean;
}

export interface Worktree {
  path: string;
  name: string;
}

export async function getRepoInfo(): Promise<RepoInfo> {
  const git = simpleGit();

  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    console.error("Error: not in a git repository");
    process.exit(1);
  }

  const commonDir = (await git.revparse(["--git-common-dir"])).trim();
  const isBare = commonDir.endsWith("/.bare");

  let repoRoot: string;
  if (isBare) {
    repoRoot = dirname(commonDir);
  } else {
    repoRoot = (await git.revparse(["--show-toplevel"])).trim();
  }

  const repoName = basename(repoRoot).replace(/-bare$/, "");

  return { git: simpleGit(repoRoot), repoRoot, repoName, isBare };
}

export async function listWorktrees(git: SimpleGit): Promise<Worktree[]> {
  const output = await git.raw(["worktree", "list", "--porcelain"]);

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
