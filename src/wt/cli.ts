#!/usr/bin/env bun

import omelette from "omelette";
import { createCli } from "trpc-cli";

import { attach } from "./attach";
import { create } from "./create";
import { list } from "./list";
import { remove } from "./remove";
import { switchWorktree } from "./switch";
import { t } from "./trpc";

const router = t.router({
  attach,
  create,
  list,
  remove,
  switch: switchWorktree,
});

const cli = createCli({ router, name: "wt" });

cli.run({
  completion: async () => {
    const completion = omelette("wt");
    if (process.argv.includes("--setup-completions")) {
      completion.setupShellInitFile();
    }
    if (process.argv.includes("--remove-completions")) {
      completion.cleanupShellInitFile();
    }
    return completion;
  },
});
