import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { execa } from "execa";
import { expect } from "vite-plus/test";

import { test } from "../fixtures.ts";

test("lazygit 'o' opens file in nvim buffer, not external editor", async ({ nvim }) => {
  // Hermetic repo: lazygit's Files panel lists this repo's changes, so the
  // test controls exactly what 'o' opens (the suite's own checkout may be
  // clean, leaving lazygit with nothing to select).
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "e2e-lazygit-"));
  await execa("git", ["init"], { cwd: repo });
  await fs.writeFile(path.join(repo, "notes.txt"), "hello lazygit\n");
  await nvim.command(`cd ${repo}`);

  try {
    // Open lazygit via Snacks (LazyVim's integration)
    await nvim.client.lua("Snacks.lazygit()");

    // Wait for lazygit to render — its panel titles are a stable marker
    await nvim.term.waitFor(/Commits/, 5_000);

    // An RPC-opened terminal float can land in terminal-normal mode, where
    // typed keys edit the (non-modifiable) buffer instead of reaching
    // lazygit — make sure we're in terminal-insert mode first.
    if ((await nvim.getMode()) !== "t") {
      await nvim.command("startinsert");
      await new Promise((r) => setTimeout(r, 200));
    }

    // Files panel is focused by default, in tree view — toggle to the flat
    // list so the highlighted entry is a file, never a directory node.
    nvim.term.type("`");
    await new Promise((r) => setTimeout(r, 300));

    // Press 'o' to open the highlighted file.
    nvim.term.type("o");
    await new Promise((r) => setTimeout(r, 1500));

    // Close lazygit so we can inspect neovim state
    nvim.term.type("q");
    await new Promise((r) => setTimeout(r, 500));

    // If lazygit float is still up (e.g. 'q' was eaten), force-close via Escape
    await nvim.input("<Esc>");
    await new Promise((r) => setTimeout(r, 300));

    // The repo's only file must now be the current buffer — proving 'o'
    // opened it in nvim rather than an external editor.
    const bufName = (await nvim.client.lua("return vim.api.nvim_buf_get_name(0)")) as string;
    expect(bufName).toMatch(/\/notes\.txt$/);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
