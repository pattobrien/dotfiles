#!/usr/bin/env bun

import { GitClient } from "./git";
import { deriveSessionName, fzfSelect, worktreeName } from "./lib";
import * as tmux from "./tmux";

if (!process.env.TMUX) {
  console.error("Error: not inside a tmux session (use wt-attach instead)");
  process.exit(1);
}

const repo = await GitClient.create();
const worktrees = await repo.listWorktrees();

const withSessions: Array<{ label: string; value: string }> = [];
const withoutSessions: Array<{ label: string; value: string }> = [];

for (const wt of worktrees) {
  const name = worktreeName(wt);
  const sessionName = deriveSessionName(repo.repoName, name);
  const item = { label: name, value: sessionName };

  if (tmux.hasSession(sessionName)) {
    withSessions.push(item);
  } else {
    withoutSessions.push(item);
  }
}

const items = [
  ...withSessions,
  ...withoutSessions.map((item) => ({
    label: `${item.label} (no session)`,
    value: item.value,
  })),
];

if (items.length === 0) {
  console.error("No worktrees found");
  process.exit(1);
}

const selected = await fzfSelect(items, "Switch to: ");
if (!selected) process.exit(0);

const sessionName = selected;

if (!tmux.hasSession(sessionName)) {
  const wt = worktrees.find(
    (wt) => deriveSessionName(repo.repoName, worktreeName(wt)) === sessionName,
  );
  if (!wt) {
    console.error("Error: could not resolve worktree path");
    process.exit(1);
  }
  tmux.newSession(sessionName, wt.path);
}

tmux.switchClient(sessionName);
