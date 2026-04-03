import { expect } from "vite-plus/test";
import { z } from "zod";

import { test } from "./fixtures.ts";

test("Ctrl-d scrolls half page down and centers cursor", async ({ nvim }) => {
  const lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`);
  await nvim.client.buffer.then((b) => b.replace(lines, 0));
  await nvim.command("normal! gg");

  const ScrollResult = z.object({
    cursor: z.number(),
    win_top: z.number(),
    win_bot: z.number(),
  });
  const result = ScrollResult.parse(
    await nvim.client.lua(`
      vim.cmd("normal! \\x04")
      local cursor = vim.api.nvim_win_get_cursor(0)[1]
      local win_top = vim.fn.line("w0")
      local win_bot = vim.fn.line("w$")
      return { cursor = cursor, win_top = win_top, win_bot = win_bot }
    `),
  );

  // Cursor should have scrolled well past the top
  expect(result.cursor).toBeGreaterThan(10);

  // zz centers: cursor should be near the middle of the visible window
  const winMiddle = Math.floor((result.win_top + result.win_bot) / 2);
  // scrolloff = 8 shifts the effective center, so allow some tolerance
  expect(Math.abs(result.cursor - winMiddle)).toBeLessThanOrEqual(12);
});

test("J in visual mode moves selected line down", async ({ nvim }) => {
  await nvim.client.buffer.then((b) =>
    b.replace(["alpha", "beta", "gamma", "delta"], 0),
  );
  await nvim.command("normal! gg");

  await nvim.client.call("feedkeys", ["VJ", "x"]);

  const content = await nvim.getBufferContent();
  const lines = content.split("\n").filter(Boolean);
  expect(lines[0]).toBe("beta");
  expect(lines[1]).toBe("alpha");
});

test("K in visual mode moves selected line up", async ({ nvim }) => {
  await nvim.client.buffer.then((b) =>
    b.replace(["alpha", "beta", "gamma", "delta"], 0),
  );
  await nvim.command("normal! 2G");

  await nvim.client.call("feedkeys", ["VK", "x"]);

  const content = await nvim.getBufferContent();
  const lines = content.split("\n").filter(Boolean);
  expect(lines[0]).toBe("beta");
  expect(lines[1]).toBe("alpha");
});

test("leader-p pastes over selection without yanking replaced text", async ({
  nvim,
}) => {
  await nvim.client.buffer.then((b) => b.replace(["hello", "world"], 0));
  await nvim.command("normal! gg");

  await nvim.command("normal! yy");
  await nvim.command("normal! j");
  await nvim.command("normal! V");
  await nvim.client.call("feedkeys", [" p", "x"]);

  // Verify the paste replaced "world" with "hello"
  const content = await nvim.getBufferContent();
  expect(content).toContain("hello\nhello");

  // Verify the register still holds "hello" (not "world" from the replaced text)
  const regContent = await nvim.client.call("getreg", ['"']);
  expect(regContent).toContain("hello");
});
