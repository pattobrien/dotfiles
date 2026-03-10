import { z } from "zod";

import { GitClient } from "../services/git/sdk";
import { TmuxClient } from "../services/tmux/sdk";

import { deriveSessionName, selectWorktree, worktreeName } from "./lib";
import { t } from "./trpc";

const removeInput = z.object({
  name: z
    .string()
    .optional()
    .meta({ positional: true })
    .describe("worktree name"),
});
const removeOutput = z.void();

export const remove = t.procedure
  .meta({
    description: "Remove a worktree and its session",
    aliases: { command: ["rm"] },
    _completion: {
      name: "git worktree list --porcelain | grep '^worktree ' | sed 's|.*/||'",
    },
  })
  .input(removeInput)
  .output(removeOutput)
  .mutation(async ({ input }) => {
    const repo = await GitClient.create();
    const tmux = new TmuxClient();
    const worktrees = await repo.listWorktrees();

    const selected = await selectWorktree(
      worktrees,
      input.name,
      "Remove worktree: ",
    );
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
  });
