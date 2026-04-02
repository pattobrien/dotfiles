import { expect } from "vite-plus/test";
import { test, useNvimStateGuard } from "./fixtures.ts";
import fs from "node:fs/promises";
import path from "node:path";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "../fixtures/ts-project");

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
  // Open picker scoped to the fixture dir (feedkeys " ff" uses git root)
  await nvim.client.lua(`Snacks.picker.files({ cwd = "${FIXTURE_DIR}", hidden = true })`);

  await nvim.tmux.waitForText("\\.dotrc", 3);

  const pane = await nvim.tmux.capture();
  expect(pane).toContain(".dotrc");

  await nvim.input("<Esc>");
});
