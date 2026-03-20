import { basename } from "node:path";

import type { Worktree } from "git";
import type { TmuxClient } from "tmux";

/** Shell command that lists worktree basenames (used in zsh completions). */
export const WORKTREE_NAMES_COMPLETION =
  "git worktree list --porcelain | grep '^worktree ' | sed 's|.*/||'";

export function deriveSessionName(repoName: string, wtName: string): string {
  return `${repoName}--${wtName}`.replace(/[.:]/g, "-");
}

export function worktreeName(wt: Worktree): string {
  return basename(wt.path);
}

export async function fzfSelect(
  items: Array<{ label: string; value: string }>,
  prompt: string,
  header?: string,
): Promise<string | null> {
  const input = items.map((item) => `${item.label}\t${item.value}`).join("\n");

  const args = [
    "fzf",
    "--ansi",
    "--reverse",
    `--prompt=${prompt}`,
    "--with-nth=1",
    "--delimiter=\t",
  ];
  if (header) {
    args.push(`--header=${header}`, "--header-first");
  }

  const proc = Bun.spawn(args, {
    stdin: new Response(input),
    stdout: "pipe",
    stderr: "inherit",
  });

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) return null;

  const parts = output.trim().split("\t");
  return parts[1] || parts[0];
}

export async function runWorktreeSetup(
  tmux: TmuxClient,
  sessionName: string,
  worktreePath: string,
): Promise<void> {
  // Window 1: install deps, pull env, then start dev server
  tmux.renameWindow({ target: `${sessionName}:1`, name: "pnpm:dev" });
  tmux.sendKeys({
    target: `${sessionName}:1`,
    keys: ["pnpm install && pnpm env:pull && pnpm dev", "Enter"],
  });

  // Window 2: claude
  tmux.newWindow({ target: sessionName, name: "claude", cwd: worktreePath, cmd: "claude" });

  // Window 3: general shell
  tmux.newWindow({ target: sessionName, cwd: worktreePath });
}

export async function fzfMultiSelect(
  items: Array<{ label: string; value: string }>,
  prompt: string,
  header?: string,
): Promise<string[]> {
  const input = items.map((item) => `${item.label}\t${item.value}`).join("\n");

  const args = [
    "fzf",
    "--ansi",
    "--reverse",
    "--multi",
    `--prompt=${prompt}`,
    "--with-nth=1",
    "--delimiter=\t",
  ];
  if (header) {
    args.push(`--header=${header}`, "--header-first");
  }

  const proc = Bun.spawn(args, {
    stdin: new Response(input),
    stdout: "pipe",
    stderr: "inherit",
  });

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) return [];

  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t");
      return parts[1] || parts[0];
    });
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
