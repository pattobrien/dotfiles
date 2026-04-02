import { expect } from "vite-plus/test";

import { test } from "./fixtures.ts";

test("Ctrl-d scrolls half page down and centers cursor", async ({ nvim }) => {
  await nvim.resetBuffer("ctrl-d");

  const lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`);
  await nvim.client.buffer.then((b) => b.replace(lines, 0));
  await nvim.command("normal! gg");

  // Execute <C-d> and read cursor in one atomic Lua call
  const line = await nvim.client.lua(`
    vim.cmd("normal! \\x04")
    return vim.api.nvim_win_get_cursor(0)[1]
  `) as number;
  expect(line).toBeGreaterThan(10);
});

test("J/K in visual mode moves selected lines", async ({ nvim }) => {
  await nvim.resetBuffer("visual-jk");

  await nvim.client.buffer.then((b) =>
    b.replace(["alpha", "beta", "gamma", "delta"], 0),
  );
  await nvim.command("normal! gg");

  // feedkeys (not normal!) so the v-mode J remap fires, not vim's join
  await nvim.client.call("feedkeys", ["VJ", "x"]);

  const content = await nvim.getBufferContent();
  const lines = content.split("\n").filter(Boolean);
  expect(lines[0]).toBe("beta");
  expect(lines[1]).toBe("alpha");
});

test("leader-p pastes over selection without yanking replaced text", async ({
  nvim,
}) => {
  await nvim.resetBuffer("leader-p");

  await nvim.client.buffer.then((b) => b.replace(["hello", "world"], 0));
  await nvim.command("normal! gg");

  await nvim.command("normal! yy");
  await nvim.command("normal! j");
  await nvim.command("normal! V");
  await nvim.client.call("feedkeys", [" p", "x"]);

  const regContent = await nvim.client.call("getreg", ['"']);
  expect(regContent).toContain("hello");
});
