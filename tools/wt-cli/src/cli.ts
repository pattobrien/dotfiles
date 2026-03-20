#!/usr/bin/env node

import { createCli } from "trpc-cli";

import { attach } from "./attach";
import { claude } from "./claude";
import { cleanup } from "./cleanup";
import { generateZshCompletions } from "./completions";
import { create } from "./create";
import { dev } from "./dev";
import { list } from "./list";
import { projects } from "./projects";
import { remove } from "./remove";
import { switchWorktree } from "./switch";
import { test } from "./test";
import { t } from "./trpc";

const router = t.router({
  attach,
  claude,
  cleanup,
  create,
  dev,
  list,
  projects,
  remove,
  switch: switchWorktree,
  test,
});

const cli = createCli({ router, name: "wt" });

if (process.argv.includes("--completions-zsh")) {
  console.log(generateZshCompletions(cli, router));
  process.exit(0);
}

void cli.run();
