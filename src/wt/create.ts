#!/usr/bin/env bun

import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { GitClient } from "../services/git/sdk";

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
const worktreePath = join(repo.worktreeDir, branchName);
const fullBranch = `patt/${branchName}`;

mkdirSync(repo.worktreeDir, { recursive: true });

await repo.createBranch({ name: fullBranch, baseRef });
await repo.addWorktree({ path: worktreePath, branch: fullBranch });

console.log("Created worktree:");
console.log(`  Path:   ${worktreePath}`);
console.log(`  Branch: ${fullBranch}`);
