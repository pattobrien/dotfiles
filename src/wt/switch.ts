#!/usr/bin/env bun

import { getRepoInfo, listWorktrees, deriveSessionName, fzfSelect } from "./lib";

if (!process.env.TMUX) {
  console.error("Error: not inside a tmux session (use wt-attach instead)");
  process.exit(1);
}

const { repoName } = await getRepoInfo();
const worktrees = await listWorktrees();

// Filter to worktrees that have existing tmux sessions
const withSessions: Array<{ label: string; value: string }> = [];
const withoutSessions: Array<{ label: string; value: string }> = [];

for (const wt of worktrees) {
  const sessionName = deriveSessionName(repoName, wt.name);
  const hasSession =
    Bun.spawnSync(["tmux", "has-session", `-t=${sessionName}`]).exitCode === 0;

  const item = { label: wt.name, value: sessionName };
  if (hasSession) {
    withSessions.push(item);
  } else {
    withoutSessions.push(item);
  }
}

// Show sessions first, then worktrees without sessions (dimmed label)
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

// Create session if it doesn't exist
const hasSession =
  Bun.spawnSync(["tmux", "has-session", `-t=${sessionName}`]).exitCode === 0;

if (!hasSession) {
  // Find the worktree path for this session
  const wt = worktrees.find(
    (wt) => deriveSessionName(repoName, wt.name) === sessionName,
  );
  if (!wt) {
    console.error("Error: could not resolve worktree path");
    process.exit(1);
  }
  Bun.spawnSync([
    "tmux", "new-session", "-d", "-s", sessionName, "-c", wt.path,
  ]);
}

Bun.spawnSync(["tmux", "switch-client", "-t", sessionName], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});
