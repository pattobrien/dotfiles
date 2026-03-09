#!/usr/bin/env bun

import {
  getRepoInfo,
  listWorktrees,
  deriveSessionName,
  fzfSelect,
} from "./lib";

const { git, repoName } = await getRepoInfo();
const worktrees = await listWorktrees(git);

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
await git.raw(["worktree", "remove", worktreeName]);
console.log(`Removed worktree: ${worktreeName}`);

// Delete the branch if it exists
const branchName = `patt/${worktreeName}`;
const branches = await git.branchLocal();
if (branches.all.includes(branchName)) {
  await git.deleteLocalBranch(branchName, true);
  console.log(`Deleted branch: ${branchName}`);
}
