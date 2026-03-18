import { existsSync } from "node:fs";

import { GitClient } from "git";
import { TmuxClient } from "tmux";
import { z } from "zod";

import {
  WORKTREE_NAMES_COMPLETION,
  deriveSessionName,
  runWorktreeSetup,
  selectWorktree,
  worktreeName,
} from "./lib";
import { t } from "./trpc";

const attachInput = z.object({
  name: z
    .string()
    .optional()
    .meta({
      positional: true,
    })
    .describe("worktree name"),
});

const attachOutput = z.void();

export const attach = t.procedure
  .meta({
    description: "Attach to a worktree tmux session",
    _completion: {
      name: WORKTREE_NAMES_COMPLETION,
    },
  })
  .input(attachInput)
  .output(attachOutput)
  .mutation(async ({ input }) => {
    const repo = await GitClient.create();
    const tmux = new TmuxClient();
    const worktrees = await repo.listWorktrees();

    const selected = await selectWorktree(
      worktrees,
      input.name,
      "Select worktree: ",
    );
    if (!selected) process.exit(0);

    if (!existsSync(selected.path)) {
      console.error(`Error: worktree not found at ${selected.path}`);
      process.exit(1);
    }

    // Find existing session by matching session_path to worktree path
    const existing = tmux.getSessionByPath(selected.path);

    if (existing) {
      tmux.switchOrAttach({ name: existing.name });
    } else {
      const wtName = worktreeName(selected);
      const sessionName = deriveSessionName(repo.repoName, wtName);
      tmux.newSession({ name: sessionName, cwd: selected.path });
      await runWorktreeSetup(tmux, sessionName, selected.path);
      tmux.switchOrAttach({ name: sessionName });
    }
  });
