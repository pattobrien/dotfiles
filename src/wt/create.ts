#!/usr/bin/env bun

import { mkdirSync } from "fs";
import { join } from "path";
import { getRepoInfo } from "./lib";

const [branchName, baseRef = "HEAD"] = process.argv.slice(2);

if (!branchName) {
  console.log("Usage: wt-create <branch-name> [base-ref]");
  console.log("");
  console.log("Creates:");
  console.log("  Branch:    patt/<branch-name>");
  console.log("  Worktree:  .worktrees/<branch-name>");
  process.exit(1);
}

const { git, repoRoot } = await getRepoInfo();
const worktreePath = join(repoRoot, ".worktrees", branchName);
const fullBranch = `patt/${branchName}`;

mkdirSync(join(repoRoot, ".worktrees"), { recursive: true });

await git.branch([fullBranch, baseRef]);
await git.raw(["worktree", "add", worktreePath, fullBranch]);

console.log("Created worktree:");
console.log(`  Path:   ${worktreePath}`);
console.log(`  Branch: ${fullBranch}`);
