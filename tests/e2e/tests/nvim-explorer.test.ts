import { expect } from "vite-plus/test";
import { test, useNvimStateGuard } from "./fixtures.ts";
import fs from "node:fs/promises";
import path from "node:path";

useNvimStateGuard();

test("file explorer shows hidden dotfiles", async ({ nvim }) => {
  const dir = `/tmp/nvim-e2e-explorer-${Date.now()}`;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, ".hidden-file"), "secret");
  await fs.writeFile(path.join(dir, "visible-file"), "public");

  await nvim.client.lua(`Snacks.explorer.open({ cwd = "${dir}" })`);

  await nvim.tmux.waitForText("hidden-file", 3);

  const pane = await nvim.tmux.capture();
  expect(pane).toContain(".hidden-file");
  expect(pane).toContain("visible-file");
});

test("file picker shows hidden files", async ({ nvim }) => {
  const dir = `/tmp/nvim-e2e-picker-${Date.now()}`;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, ".dotrc"), "KEY=1");
  await fs.writeFile(path.join(dir, "index.ts"), "export {}");

  const { execaCommand } = await import("execa");
  await execaCommand("git init", { cwd: dir });
  await execaCommand("git add .", { cwd: dir });

  await nvim.command(`cd ${dir}`);
  await nvim.client.call("feedkeys", [" ff", "x"]);

  await nvim.tmux.waitForText("\\.dotrc", 5);

  const pane = await nvim.tmux.capture();
  expect(pane).toContain(".dotrc");

  await nvim.input("<Esc>");
});
