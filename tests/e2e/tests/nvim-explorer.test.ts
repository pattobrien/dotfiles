import { expect } from "vite-plus/test";
import { test } from "./fixtures.ts";
import fs from "node:fs/promises";
import path from "node:path";

test("file explorer shows hidden dotfiles", async ({ nvim }) => {
  // Create a temp directory with a dotfile
  const dir = `/tmp/nvim-e2e-explorer-${Date.now()}`;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, ".hidden-file"), "secret");
  await fs.writeFile(path.join(dir, "visible-file"), "public");

  // Open the explorer in the temp directory
  await nvim.command(`cd ${dir}`);
  await nvim.input(" e"); // <leader>e opens explorer

  // Wait for explorer to render
  await nvim.tmux.waitForText("hidden-file", 3);

  const pane = await nvim.tmux.capture();
  expect(pane).toContain(".hidden-file");
  expect(pane).toContain("visible-file");

  await fs.rm(dir, { recursive: true });
});

test("file picker shows hidden files", async ({ nvim }) => {
  const dir = `/tmp/nvim-e2e-picker-${Date.now()}`;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, ".env"), "SECRET=1");
  await fs.writeFile(path.join(dir, "index.ts"), "export {}");

  // Initialize as a git repo so the picker works
  const { execaCommand } = await import("execa");
  await execaCommand("git init", { cwd: dir });
  await execaCommand("git add .", { cwd: dir });

  await nvim.command(`cd ${dir}`);
  await nvim.input(" ff"); // <leader>ff opens file finder

  // Wait for picker to show the hidden file
  await nvim.tmux.waitForText("\\.env", 3);

  const pane = await nvim.tmux.capture();
  expect(pane).toContain(".env");

  await nvim.input("<Esc>");
  await fs.rm(dir, { recursive: true });
});
