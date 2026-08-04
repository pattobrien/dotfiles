import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { execa } from "execa";
import { expect } from "vite-plus/test";

import { pollFor } from "../../src/term/backend.ts";
import { test } from "../fixtures.ts";

test("lazygit 'o' opens file in nvim buffer, not external editor", async ({ nvim }) => {
  // Hermetic repo: lazygit's Files panel lists this repo's changes, so the
  // test controls exactly what 'o' opens (the suite's own checkout may be
  // clean, leaving lazygit with nothing to select).
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "e2e-lazygit-"));
  await execa("git", ["init"], { cwd: repo });
  await fs.writeFile(path.join(repo, "notes.txt"), "hello lazygit\n");
  await nvim.command(`cd ${repo}`);

  const t = nvim.term.term;
  try {
    // Open lazygit via Snacks (LazyVim's integration) and wait for its UI —
    // panel titles are a stable marker.
    await nvim.client.lua("Snacks.lazygit()");
    await expect(t.screen).toContainText("Commits", { timeout: 5_000 });

    // An RPC-opened terminal float can land in terminal-normal mode, where
    // typed keys edit the (non-modifiable) buffer instead of reaching
    // lazygit. Mode isn't screen-observable, so this one waits on RPC.
    if ((await nvim.getMode()) !== "t") {
      await nvim.command("startinsert");
      await pollFor(async () => (await nvim.getMode()) === "t", "terminal-insert mode");
    }

    // Files panel is focused by default, in tree view — toggle to the flat
    // list so the highlighted entry is a file, never a directory node, and
    // let the redraw settle before targeting it.
    nvim.term.type("`");
    await expect(t.screen).toContainText("notes.txt", { timeout: 3_000 });
    await t.waitForStable();

    // 'o' opens the highlighted file in the parent nvim and Snacks closes
    // the float; quit lazygit explicitly if focus stayed in it ('q' in a
    // normal-mode buffer would start recording a macro instead).
    nvim.term.type("o");
    await t.waitForStable();
    if ((await nvim.getMode()) === "t") {
      nvim.term.type("q");
      await nvim.input("<Esc>");
    }

    // The file's content on screen proves the buffer opened in this nvim
    // (the near-fullscreen lazygit float would cover it otherwise).
    await expect(t.screen).toContainText("hello lazygit", { timeout: 5_000 });
    const bufName = (await nvim.client.lua("return vim.api.nvim_buf_get_name(0)")) as string;
    expect(bufName).toMatch(/\/notes\.txt$/);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
