import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { GitClient } from "git";
import { z } from "zod";

import { t } from "./trpc";

const createInput = z.object({
  branch: z.string().meta({ positional: true }).describe("branch name"),
  baseRef: z.string().default("HEAD").describe("base ref to branch from"),
});

const createOutput = z.void();

export const create = t.procedure
  .meta({
    description: "Create a new worktree",
    _completion: {
      branch: "git branch -r --format='%(refname:short)' | sed 's|^origin/||'",
      baseRef:
        "git for-each-ref --format='%(refname:short)' refs/heads refs/tags",
    },
  })
  .input(createInput)
  .output(createOutput)
  .mutation(async ({ input }) => {
    const repo = await GitClient.create();
    const worktreePath = join(repo.worktreeDir, input.branch);
    const fullBranch = `patt/${input.branch}`;

    mkdirSync(repo.worktreeDir, { recursive: true });

    await repo.createBranch({ name: fullBranch, baseRef: input.baseRef });
    await repo.addWorktree({ path: worktreePath, branch: fullBranch });

    console.log("Created worktree:");
    console.log(`  Path:   ${worktreePath}`);
    console.log(`  Branch: ${fullBranch}`);
  });
