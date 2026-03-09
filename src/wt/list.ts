#!/usr/bin/env bun

import { getRepoInfo, listWorktrees, deriveSessionName } from "./lib";

const { git, repoName } = await getRepoInfo();
const worktrees = await listWorktrees(git);

// Get tmux session info
const tmuxSessions = new Map<string, string>();
const activeSession = process.env.TMUX
  ? Bun.spawnSync(["tmux", "display-message", "-p", "#S"], {
      stdout: "pipe",
    })
      .stdout.toString()
      .trim()
  : null;

const tmuxList = Bun.spawnSync(
  ["tmux", "list-sessions", "-F", "#{session_name}"],
  { stdout: "pipe", stderr: "pipe" },
);

if (tmuxList.exitCode === 0) {
  for (const name of tmuxList.stdout.toString().trim().split("\n")) {
    if (!name) continue;
    tmuxSessions.set(name, name === activeSession ? "active" : "detached");
  }
}

// Display
const nameWidth = Math.max(...worktrees.map((wt) => wt.name.length), 4);
const statusWidth = 10;

console.log(
  `${"WORKTREE".padEnd(nameWidth)}  ${"SESSION".padEnd(statusWidth)}  PATH`,
);
console.log(
  `${"─".repeat(nameWidth)}  ${"─".repeat(statusWidth)}  ${"─".repeat(30)}`,
);

for (const wt of worktrees) {
  const sessionName = deriveSessionName(repoName, wt.name);
  const status = tmuxSessions.get(sessionName) ?? "—";
  const statusColor =
    status === "active"
      ? "\x1b[32m"
      : status === "detached"
        ? "\x1b[33m"
        : "\x1b[90m";
  const reset = "\x1b[0m";

  console.log(
    `${wt.name.padEnd(nameWidth)}  ${statusColor}${status.padEnd(statusWidth)}${reset}  ${wt.path}`,
  );
}
