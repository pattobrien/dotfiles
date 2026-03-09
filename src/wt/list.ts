#!/usr/bin/env bun

import pc from "picocolors";

import { GitClient } from "../services/git/sdk";
import { TmuxClient } from "../services/tmux/sdk";

import { deriveSessionName, worktreeName } from "./lib";

const repo = await GitClient.create();
const tmux = new TmuxClient();
const worktrees = await repo.listWorktrees();

const sessions = tmux.listSessions();
const activeSession = tmux.getActiveSession();
const sessionMap = new Map(
  sessions.map((s) => [
    s.name,
    s.name === activeSession ? "active" : "detached",
  ]),
);

const names = worktrees.map(worktreeName);
const nameWidth = Math.max(...names.map((n) => n.length), 4);
const statusWidth = 10;

console.log(
  `${"WORKTREE".padEnd(nameWidth)}  ${"SESSION".padEnd(statusWidth)}  PATH`,
);
console.log(
  `${"─".repeat(nameWidth)}  ${"─".repeat(statusWidth)}  ${"─".repeat(30)}`,
);

for (const wt of worktrees) {
  const name = worktreeName(wt);
  const sessionName = deriveSessionName(repo.repoName, name);
  const status = sessionMap.get(sessionName) ?? "—";
  const padded = status.padEnd(statusWidth);
  const colored =
    status === "active"
      ? pc.green(padded)
      : status === "detached"
        ? pc.yellow(padded)
        : pc.dim(padded);

  console.log(`${name.padEnd(nameWidth)}  ${colored}  ${wt.path}`);
}
