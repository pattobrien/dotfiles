import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { GitClient } from "../services/git/sdk";

export async function create(
  branchName: string,
  baseRef = "HEAD",
): Promise<void> {
  const repo = await GitClient.create();
  const worktreePath = join(repo.worktreeDir, branchName);
  const fullBranch = `patt/${branchName}`;

  mkdirSync(repo.worktreeDir, { recursive: true });

  await repo.createBranch({ name: fullBranch, baseRef });
  await repo.addWorktree({ path: worktreePath, branch: fullBranch });

  console.log("Created worktree:");
  console.log(`  Path:   ${worktreePath}`);
  console.log(`  Branch: ${fullBranch}`);
}
