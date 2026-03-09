#!/usr/bin/env bun

const command = process.argv[2];

// Shift argv so subcommands see their own args at process.argv[2]
process.argv = [process.argv[0], process.argv[1], ...process.argv.slice(3)];

switch (command) {
  case "attach":
    await import("./attach");
    break;
  case "create":
    await import("./create");
    break;
  case "list":
  case "ls":
    await import("./list");
    break;
  case "remove":
  case "rm":
    await import("./remove");
    break;
  case "switch":
  case "sw":
    await import("./switch");
    break;
  default:
    console.log("Usage: wt <command> [args]");
    console.log("");
    console.log("Commands:");
    console.log("  attach [name]              Attach to a worktree tmux session");
    console.log("  create <branch> [base-ref] Create a new worktree");
    console.log("  list (ls)                  List worktrees and their sessions");
    console.log("  remove (rm) [name]         Remove a worktree and its session");
    console.log("  switch (sw)                Switch to another worktree session");
    process.exit(command ? 1 : 0);
}
