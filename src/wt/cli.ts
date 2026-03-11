#!/usr/bin/env bun

import { createCli } from "trpc-cli";

import { attach } from "./attach";
import { generateZshCompletions } from "./completions";
import { create } from "./create";
import { list } from "./list";
import { projects } from "./projects";
import { remove } from "./remove";
import { switchWorktree } from "./switch";
import { t } from "./trpc";

const router = t.router({
  attach,
  create,
  list,
  projects,
  remove,
  switch: switchWorktree,
});

const cli = createCli({ router, name: "wt" });

if (process.argv.includes("--completions-zsh")) {
  console.log(generateZshCompletions(cli, router));
  process.exit(0);
}

cli.run();
