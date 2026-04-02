import { expect } from "vite-plus/test";
import { test } from "./fixtures.ts";
import fs from "node:fs/promises";
import path from "node:path";

test("file explorer shows hidden dotfiles", { timeout: 20_000 }, async ({ nvim }) => {
  await nvim.resetBuffer();
  const dir = `/tmp/nvim-e2e-explorer-${Date.now()}`;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, ".hidden-file"), "secret");
  await fs.writeFile(path.join(dir, "visible-file"), "public");

  // Open the explorer in the temp directory
  await nvim.command(`cd ${dir}`);
  await nvim.client.call("feedkeys", [" e", "x"]); // <leader>e opens explorer

  // Wait for explorer to render (generous timeout for parallel execution)
  await nvim.tmux.waitForText("hidden-file", 10);

  const pane = await nvim.tmux.capture();
  expect(pane).toContain(".hidden-file");
  expect(pane).toContain("visible-file");

  await fs.rm(dir, { recursive: true });
});

test("file picker shows hidden files", { timeout: 20_000 }, async ({ nvim }) => {
  await nvim.resetBuffer();
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

  // Wait for picker to show the hidden file (generous timeout for parallel execution)
  await nvim.tmux.waitForText("\\.dotrc", 10);

  const pane = await nvim.tmux.capture();
  expect(pane).toContain(".dotrc");

  await nvim.input("<Esc>");
  await fs.rm(dir, { recursive: true });
});
