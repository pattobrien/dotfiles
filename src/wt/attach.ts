#!/usr/bin/env bun

import { existsSync } from "fs";
import { join } from "path";
import { GitClient } from "./git";
import { deriveSessionName, selectWorktree, worktreeName } from "./lib";
import * as tmux from "./tmux";

const repo = await GitClient.create();
const worktrees = await repo.listWorktrees();

const selected = await selectWorktree(worktrees, process.argv[2], "Select worktree: ");
if (!selected) process.exit(0);

if (!existsSync(selected.path)) {
  console.error(`Error: worktree not found at ${selected.path}`);
  process.exit(1);
}

const name = worktreeName(selected);
const sessionName = deriveSessionName(repo.repoName, name);

if (!tmux.hasSession(sessionName)) {
  tmux.newSession(sessionName, selected.path);

  const setupScript = join(selected.path, ".tmux-setup.sh");
  if (existsSync(setupScript)) {
    tmux.sendKeys(sessionName, "source .tmux-setup.sh", "Enter");
  }
}

tmux.switchOrAttach(sessionName);
