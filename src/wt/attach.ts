#!/usr/bin/env bun

import { existsSync } from "fs";
import { join } from "path";
import {
  deriveSessionName,
  fzfSelect,
  getRepoInfo,
  listWorktrees,
} from "./lib";

const { git, repoName } = await getRepoInfo();
const worktrees = await listWorktrees(git);

let worktreePath: string;
let worktreeName: string;

const arg = process.argv[2];

if (arg) {
  const match = worktrees.find((wt) => wt.name === arg);
  if (!match) {
    console.error(`Error: no worktree found matching '${arg}'`);
    process.exit(1);
  }
  worktreePath = match.path;
  worktreeName = match.name;
} else {
  const selected = await fzfSelect(
    worktrees.map((wt) => ({ label: wt.name, value: wt.path })),
    "Select worktree: ",
  );
  if (!selected) process.exit(0);
  worktreePath = selected;
  worktreeName = worktrees.find((wt) => wt.path === selected)!.name;
}

if (!existsSync(worktreePath)) {
  console.error(`Error: worktree not found at ${worktreePath}`);
  process.exit(1);
}

const sessionName = deriveSessionName(repoName, worktreeName);
const insideTmux = !!process.env.TMUX;

const hasSession =
  Bun.spawnSync(["tmux", "has-session", `-t=${sessionName}`]).exitCode === 0;

if (hasSession) {
  const cmd = insideTmux ? "switch-client" : "attach-session";
  Bun.spawnSync(["tmux", cmd, "-t", sessionName], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
} else {
  Bun.spawnSync([
    "tmux", "new-session", "-d", "-s", sessionName, "-c", worktreePath,
  ]);

  const setupScript = join(worktreePath, ".tmux-setup.sh");
  if (existsSync(setupScript)) {
    Bun.spawnSync([
      "tmux", "send-keys", "-t", sessionName, "source .tmux-setup.sh", "Enter",
    ]);
  }

  const cmd = insideTmux ? "switch-client" : "attach-session";
  Bun.spawnSync(["tmux", cmd, "-t", sessionName], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
}
