#!/usr/bin/env bun

import { createCli } from "trpc-cli";

import { attach } from "./attach";
import { generateZshCompletions } from "./completions";
import { create } from "./create";
import { list } from "./list";
import { remove } from "./remove";
import { repos } from "./repos";
import { switchWorktree } from "./switch";
import { t } from "./trpc";

const router = t.router({
  attach,
  create,
  list,
  remove,
  repos,
  switch: switchWorktree,
});

const cli = createCli({ router, name: "wt" });

if (process.argv.includes("--completions-zsh")) {
  console.log(generateZshCompletions(cli, router));
  process.exit(0);
}

cli.run();
