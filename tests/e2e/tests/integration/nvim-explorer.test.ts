import fs from "node:fs/promises";
import path from "node:path";

import { expect } from "vite-plus/test";

import { test } from "../fixtures.ts";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "../../fixtures/ts-project");

test("file explorer shows hidden dotfiles", async ({ nvim }) => {
  const dir = `/tmp/nvim-e2e-explorer-${Date.now()}`;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, ".hidden-file"), "secret");
  await fs.writeFile(path.join(dir, "visible-file"), "public");

  try {
    await nvim.client.lua(`Snacks.explorer.open({ cwd = "${dir}" })`);

    await nvim.term.waitFor("hidden-file", 3_000);

    const screen = nvim.term.text();
    expect(screen).toContain(".hidden-file");
    expect(screen).toContain("visible-file");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("file picker shows hidden files", async ({ nvim }) => {
  // Open picker scoped to the fixture dir (feedkeys " ff" uses git root)
  await nvim.client.lua(`Snacks.picker.files({ cwd = "${FIXTURE_DIR}", hidden = true })`);

  await nvim.term.waitFor(/\.dotrc/, 3_000);

  const screen = nvim.term.text();
  expect(screen).toContain(".dotrc");

  await nvim.input("<Esc>");
});
