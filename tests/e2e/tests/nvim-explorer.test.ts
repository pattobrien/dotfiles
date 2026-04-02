import { expect } from "vite-plus/test";
import { test } from "./fixtures.ts";
import fs from "node:fs/promises";
import path from "node:path";

test("file explorer shows hidden dotfiles", async ({ nvim }) => {
  await nvim.resetBuffer("explorer");
  const dir = `/tmp/nvim-e2e-explorer-${Date.now()}`;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, ".hidden-file"), "secret");
  await fs.writeFile(path.join(dir, "visible-file"), "public");

  // Open explorer explicitly in the temp dir (feedkeys " e" uses root_spec which
  // falls back to the git project root, not cwd)
  await nvim.client.lua(`Snacks.explorer.open({ cwd = "${dir}" })`);

  await nvim.tmux.waitForText("hidden-file", 3);

  const pane = await nvim.tmux.capture();
  expect(pane).toContain(".hidden-file");
  expect(pane).toContain("visible-file");

  // Temp dirs in /tmp are cleaned up by the OS — don't delete while nvim
  // still has buffers referencing files in this dir (causes lualine errors).
});

test("file picker shows hidden files", async ({ nvim }) => {
  await nvim.resetBuffer("explorer");
  const dir = `/tmp/nvim-e2e-picker-${Date.now()}`;
  await fs.mkdir(dir, { recursive: true });
  // Use .dotrc instead of .env — .env is in the global gitignore (~/.config/git/ignore)
  // and the snacks picker respects gitignore, so .env would never appear.
  await fs.writeFile(path.join(dir, ".dotrc"), "KEY=1");
  await fs.writeFile(path.join(dir, "index.ts"), "export {}");

  // Initialize as a git repo so the picker works
  const { execaCommand } = await import("execa");
  await execaCommand("git init", { cwd: dir });
  await execaCommand("git add .", { cwd: dir });

  await nvim.command(`cd ${dir}`);
  await nvim.client.call("feedkeys", [" ff", "x"]); // <leader>ff opens file finder

  await nvim.tmux.waitForText("\\.dotrc", 3);

  const pane = await nvim.tmux.capture();
  expect(pane).toContain(".dotrc");

  await nvim.input("<Esc>");
  // Temp dirs in /tmp are cleaned up by the OS — don't delete while nvim
  // still has buffers referencing files in this dir (causes lualine errors).
});
