import { GitClient } from "git";
import { TmuxClient } from "tmux";
import { z } from "zod";

import { WORKTREE_NAMES_COMPLETION, selectWorktree, worktreeName } from "./lib";
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
      name: WORKTREE_NAMES_COMPLETION,
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

    // Find session by matching session_path to worktree path
    const session = tmux.getSessionByPath(selected.path);

    if (session) {
      tmux.killSession({ name: session.name });
      console.log(`Killed tmux session: ${session.name}`);
    }

    await repo.removeWorktree({ path: selected.path });
    console.log(`Removed worktree: ${wtName}`);

    if (selected.branch) {
      const branchName = selected.branch.replace(/^refs\/heads\//, "");
      await repo.deleteBranch({ name: branchName, force: true });
      console.log(`Deleted branch: ${branchName}`);
    }
  });
