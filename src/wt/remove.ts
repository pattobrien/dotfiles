#!/usr/bin/env bun

import { getRepoInfo, listWorktrees, deriveSessionName, fzfSelect } from "./lib";
import { $ } from "bun";

const { repoName } = await getRepoInfo();
const worktrees = await listWorktrees();

let worktreeName: string;

const arg = process.argv[2];

if (arg) {
  const match = worktrees.find((wt) => wt.name === arg);
  if (!match) {
    console.error(`Error: no worktree found matching '${arg}'`);
    process.exit(1);
  }
  worktreeName = match.name;
} else {
  const selected = await fzfSelect(
    worktrees.map((wt) => ({ label: wt.name, value: wt.name })),
    "Remove worktree: ",
  );
  if (!selected) process.exit(0);
  worktreeName = selected;
}

const sessionName = deriveSessionName(repoName, worktreeName);

// Kill tmux session if it exists
const hasSession =
  Bun.spawnSync(["tmux", "has-session", `-t=${sessionName}`]).exitCode === 0;

if (hasSession) {
  Bun.spawnSync(["tmux", "kill-session", "-t", sessionName]);
  console.log(`Killed tmux session: ${sessionName}`);
}

// Remove the git worktree
await $`git worktree remove ${worktreeName}`.quiet();
console.log(`Removed worktree: ${worktreeName}`);

// Delete the branch if it exists
const branchName = `patt/${worktreeName}`;
const branchExists =
  Bun.spawnSync(["git", "rev-parse", "--verify", branchName], {
    stdout: "pipe",
    stderr: "pipe",
  }).exitCode === 0;

if (branchExists) {
  await $`git branch -D ${branchName}`.quiet();
  console.log(`Deleted branch: ${branchName}`);
}
