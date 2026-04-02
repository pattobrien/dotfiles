import { expect } from "vitest";

import { test } from "./fixtures.ts";

test("Ctrl-d scrolls half page down and centers cursor", async ({ nvim }) => {
  // Insert enough lines to enable scrolling
  const lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`);
  await nvim.client.buffer.then((b) => b.replace(lines, 0));
  await nvim.command("normal! gg");

  // Send <C-d> — should scroll down and center
  await nvim.input("<C-d>");

  const [line] = await nvim.getCursorPosition();
  // Cursor should have moved down (default scrolloff=8, half-page ~25 lines)
  expect(line).toBeGreaterThan(10);

  // Verify cursor line is visible in the pane
  const pane = await nvim.tmux.capture();
  expect(pane).toContain(`line ${line}`);
});

test("J/K in visual mode moves selected lines", async ({ nvim }) => {
  await nvim.client.buffer.then((b) =>
    b.replace(["alpha", "beta", "gamma", "delta"], 0),
  );
  await nvim.command("normal! gg");

  // Select line 1 ("alpha"), press J to move it down
  await nvim.input("V");
  await nvim.input("J");

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
  await nvim.input("yy");

  // Select "world" (line 2) in visual mode and paste over it with <leader>p
  await nvim.input("j");
  await nvim.input("V");
  await nvim.input(" p"); // space = leader

  // Yank register should still contain "hello", not "world"
  const regContent = await nvim.client.call("getreg", ['"']);
  expect(regContent).toContain("hello");
});
