#!/usr/bin/env bun

import { GitClient } from "../services/git/sdk";
import { TmuxClient } from "../services/tmux/sdk";

import { deriveSessionName, selectWorktree, worktreeName } from "./lib";

const repo = await GitClient.create();
const tmux = new TmuxClient();
const worktrees = await repo.listWorktrees();

const selected = await selectWorktree(
  worktrees,
  process.argv[2],
  "Remove worktree: ",
);
if (!selected) process.exit(0);

const name = worktreeName(selected);
const sessionName = deriveSessionName(repo.repoName, name);

if (tmux.hasSession(sessionName)) {
  tmux.killSession(sessionName);
  console.log(`Killed tmux session: ${sessionName}`);
}

await repo.removeWorktree(name);
console.log(`Removed worktree: ${name}`);

const branchName = `patt/${name}`;
if (await repo.hasLocalBranch(branchName)) {
  await repo.deleteBranch(branchName, true);
  console.log(`Deleted branch: ${branchName}`);
}
