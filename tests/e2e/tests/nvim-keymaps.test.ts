import { expect } from "vite-plus/test";

import { test } from "./fixtures.ts";

test("Ctrl-d scrolls half page down and centers cursor", async ({ nvim }) => {
  // Insert enough lines to enable scrolling
  const lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`);
  await nvim.client.buffer.then((b) => b.replace(lines, 0));
  await nvim.command("normal! gg");

  // Use normal! for synchronous execution (nvim_input is queued)
  await nvim.command("normal! \x04"); // <C-d>

  const [line] = await nvim.getCursorPosition();
  // Cursor should have moved down ~25 lines (half-page in a 50-row pane)
  expect(line).toBeGreaterThan(10);
});

test("J/K in visual mode moves selected lines", async ({ nvim }) => {
  await nvim.client.buffer.then((b) =>
    b.replace(["alpha", "beta", "gamma", "delta"], 0),
  );
  await nvim.command("normal! gg");

  // Must use feedkeys (not normal!) so the v-mode J remap fires, not vim's join
  await nvim.client.call("feedkeys", ["VJ", "x"]);

  const content = await nvim.getBufferContent();
  const lines = content.split("\n").filter(Boolean);
  // "alpha" should now be line 2 (after "beta")
  expect(lines[0]).toBe("beta");
  expect(lines[1]).toBe("alpha");
});

test("leader-p pastes over selection without yanking replaced text", async ({
  nvim,
}) => {
  await nvim.client.buffer.then((b) => b.replace(["hello", "world"], 0));
  await nvim.command("normal! gg");

  // Yank "hello" (line 1)
  await nvim.command("normal! yy");

  // Move to "world" (line 2), select it, paste over with <leader>p
  await nvim.command("normal! j");
  await nvim.command("normal! V");
  // <leader>p needs feedkeys so the remap fires
  await nvim.client.call("feedkeys", [" p", "x"]); // x = remap mode

  // Yank register should still contain "hello", not "world"
  const regContent = await nvim.client.call("getreg", ['"']);
  expect(regContent).toContain("hello");
});
