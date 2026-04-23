import { expect } from "vite-plus/test";

import { test } from "./fixtures.ts";

test("lazygit 'o' opens file in nvim buffer, not external editor", async ({
  nvim,
}) => {
  // Open lazygit via Snacks (LazyVim's integration)
  await nvim.client.lua("Snacks.lazygit()");

  // Wait for lazygit to render — the branch name should appear
  await nvim.tmux.waitForText("refactor/neovim", 5);

  // Files panel is focused by default. Press 'o' to open the highlighted file.
  await nvim.tmux.sendKeys("o");
  await new Promise((r) => setTimeout(r, 1500));

  // Close lazygit so we can inspect neovim state
  await nvim.tmux.sendKeys("q");
  await new Promise((r) => setTimeout(r, 500));

  // If lazygit float is still up (e.g. 'q' was eaten), force-close via Escape
  await nvim.input("<Esc>");
  await new Promise((r) => setTimeout(r, 300));

  // Check that a file was opened as a neovim buffer
  const bufName = (await nvim.client.lua(
    "return vim.api.nvim_buf_get_name(0)",
  )) as string;

  // The buffer should contain a real file path (not the empty scratch buffer)
  expect(bufName).toMatch(/\.\w+/);
});
