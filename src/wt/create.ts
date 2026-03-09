#!/usr/bin/env bun

import { mkdirSync } from "fs";
import { join } from "path";
import { GitClient } from "./git";

const [branchName, baseRef = "HEAD"] = process.argv.slice(2);

if (!branchName) {
  console.log("Usage: wt-create <branch-name> [base-ref]");
  console.log("");
  console.log("Creates:");
  console.log("  Branch:    patt/<branch-name>");
  console.log("  Worktree:  .worktrees/<branch-name>");
  process.exit(1);
}

const repo = await GitClient.create();
const worktreePath = join(repo.repoRoot, ".worktrees", branchName);
const fullBranch = `patt/${branchName}`;

mkdirSync(join(repo.repoRoot, ".worktrees"), { recursive: true });

await repo.createBranch(fullBranch, baseRef);
await repo.addWorktree(worktreePath, fullBranch);

console.log("Created worktree:");
console.log(`  Path:   ${worktreePath}`);
console.log(`  Branch: ${fullBranch}`);
