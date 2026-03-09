#!/usr/bin/env bun

import { Command } from "commander";

const program = new Command()
  .name("wt")
  .description("Git worktree + tmux session manager");

program
  .command("attach")
  .description("Attach to a worktree tmux session")
  .argument("[name]", "worktree name")
  .action(async (name?: string) => {
    const { attach } = await import("./attach");
    await attach(name);
  });

program
  .command("create")
  .description("Create a new worktree")
  .argument("<branch>", "branch name")
  .argument("[base-ref]", "base ref to branch from", "HEAD")
  .action(async (branch: string, baseRef: string) => {
    const { create } = await import("./create");
    await create(branch, baseRef);
  });

program
  .command("list")
  .alias("ls")
  .description("List worktrees and their sessions")
  .action(async () => {
    const { list } = await import("./list");
    await list();
  });

program
  .command("remove")
  .alias("rm")
  .description("Remove a worktree and its session")
  .argument("[name]", "worktree name")
  .action(async (name?: string) => {
    const { remove } = await import("./remove");
    await remove(name);
  });

program
  .command("switch")
  .alias("sw")
  .description("Switch to another worktree session")
  .action(async () => {
    const { switchWorktree } = await import("./switch");
    await switchWorktree();
  });

program.parse();
