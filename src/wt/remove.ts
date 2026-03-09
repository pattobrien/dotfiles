import { GitClient } from "../services/git/sdk";
import { TmuxClient } from "../services/tmux/sdk";

import { deriveSessionName, selectWorktree, worktreeName } from "./lib";

export async function remove(name?: string): Promise<void> {
  const repo = await GitClient.create();
  const tmux = new TmuxClient();
  const worktrees = await repo.listWorktrees();

  const selected = await selectWorktree(worktrees, name, "Remove worktree: ");
  if (!selected) process.exit(0);

  const wtName = worktreeName(selected);
  const sessionName = deriveSessionName(repo.repoName, wtName);

  if (tmux.hasSession({ name: sessionName })) {
    tmux.killSession({ name: sessionName });
    console.log(`Killed tmux session: ${sessionName}`);
  }

  await repo.removeWorktree({ name: wtName });
  console.log(`Removed worktree: ${wtName}`);

  const branchName = `patt/${wtName}`;
  if (await repo.hasLocalBranch({ name: branchName })) {
    await repo.deleteBranch({ name: branchName, force: true });
    console.log(`Deleted branch: ${branchName}`);
  }
}
