import { expect } from "vite-plus/test";

import { test } from "../fixtures.ts";

test("lazygit 'o' opens file in nvim buffer, not external editor", async ({ nvim }) => {
  // Open lazygit via Snacks (LazyVim's integration)
  await nvim.client.lua("Snacks.lazygit()");

  // Wait for lazygit to render — its panel titles are a stable marker
  // (branch names change; the old "refactor/neovim" marker only worked
  // because the persistent fixture predated the branch cleanup).
  await nvim.term.waitFor(/Commits/, 5_000);

  // An RPC-opened terminal float can land in terminal-normal mode, where
  // typed keys edit the (non-modifiable) buffer instead of reaching
  // lazygit — make sure we're in terminal-insert mode first.
  if ((await nvim.getMode()) !== "t") {
    await nvim.command("startinsert");
    await new Promise((r) => setTimeout(r, 200));
  }

  // Files panel is focused by default, in tree view — the first entry is a
  // directory node, and opening a directory would land in the explorer
  // instead of a file buffer. Toggle to the flat list first.
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

  // Check that a file was opened as a neovim buffer
  const bufName = (await nvim.client.lua("return vim.api.nvim_buf_get_name(0)")) as string;

  // The buffer should contain a real file path (not the empty scratch buffer)
  expect(bufName).toMatch(/\.\w+/);
});
