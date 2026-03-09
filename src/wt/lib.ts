import { basename } from "path";

import type { Worktree } from "./git";

export function deriveSessionName(
  repoName: string,
  worktreeName: string,
): string {
  return `${repoName}--${worktreeName}`.replace(/[.:]/g, "-");
}

export function worktreeName(wt: Worktree): string {
  return basename(wt.path);
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

export async function selectWorktree(
  worktrees: Worktree[],
  arg: string | undefined,
  prompt: string,
): Promise<Worktree | null> {
  if (arg) {
    const match = worktrees.find((wt) => worktreeName(wt) === arg);
    if (!match) {
      console.error(`Error: no worktree found matching '${arg}'`);
      process.exit(1);
    }
    return match;
  }

  const selected = await fzfSelect(
    worktrees.map((wt) => ({ label: worktreeName(wt), value: wt.path })),
    prompt,
  );
  if (!selected) return null;
  return worktrees.find((wt) => wt.path === selected) ?? null;
}
