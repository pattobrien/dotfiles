import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { execa } from "execa";
import { expect } from "vitest";

import { test } from "./fixtures.ts";

test("lazygit 'o' opens file in nvim buffer, not external editor", async ({ nvim }) => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "nvim-e2e-lazygit-"));
  const target = path.join(repo, "target.txt");

  try {
    await execa("git", ["init", "-b", "main"], { cwd: repo });
    await fs.writeFile(target, "before\n");
    await execa("git", ["add", "target.txt"], { cwd: repo });
    await execa(
      "git",
      ["-c", "user.name=e2e", "-c", "user.email=e2e@example.com", "commit", "-m", "initial"],
      { cwd: repo },
    );
    await fs.writeFile(target, "after\n");

    await nvim.command(`cd ${repo}`);
    await nvim.client.lua("Snacks.lazygit()");

    await nvim.tmux.waitForText("target.txt", 5);

    // Focus the files panel, move from repo root to the changed file, and open it.
    await nvim.tmux.sendKeys("2", "j", "o");
    await new Promise((r) => setTimeout(r, 1500));

    await nvim.tmux.sendKeys("q");
    await new Promise((r) => setTimeout(r, 500));
    await nvim.input("<Esc>");
    await new Promise((r) => setTimeout(r, 300));

    const bufName = (await nvim.client.lua("return vim.api.nvim_buf_get_name(0)")) as string;
    expect(await fs.realpath(bufName)).toBe(await fs.realpath(target));
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
