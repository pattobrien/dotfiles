import { existsSync } from "node:fs";

import { GitClient } from "../services/git/sdk";
import { TmuxClient } from "../services/tmux/sdk";

import {
  deriveSessionName,
  runWorktreeSetup,
  selectWorktree,
  worktreeName,
} from "./lib";

export async function attach(name?: string): Promise<void> {
  const repo = await GitClient.create();
  const tmux = new TmuxClient();
  const worktrees = await repo.listWorktrees();

  const selected = await selectWorktree(worktrees, name, "Select worktree: ");
  if (!selected) process.exit(0);

  if (!existsSync(selected.path)) {
    console.error(`Error: worktree not found at ${selected.path}`);
    process.exit(1);
  }

  const wtName = worktreeName(selected);
  const sessionName = deriveSessionName(repo.repoName, wtName);

  if (!tmux.hasSession({ name: sessionName })) {
    tmux.newSession({ name: sessionName, cwd: selected.path });
    await runWorktreeSetup(tmux, sessionName, selected.path);
  }

  tmux.switchOrAttach({ name: sessionName });
}
