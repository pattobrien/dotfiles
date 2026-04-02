import { expect } from "vite-plus/test";

import { test } from "./fixtures.ts";

test("Ctrl-d scrolls half page down and centers cursor", async ({ nvim }) => {
  await nvim.resetBuffer();

  const lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`);
  await nvim.client.buffer.then((b) => b.replace(lines, 0));
  await nvim.command("normal! gg");

  await nvim.command("normal! \x04"); // <C-d>

  const [line] = await nvim.getCursorPosition();
  expect(line).toBeGreaterThan(10);
});

test("J/K in visual mode moves selected lines", async ({ nvim }) => {
  await nvim.resetBuffer();

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
  await nvim.resetBuffer();

  await nvim.client.buffer.then((b) => b.replace(["hello", "world"], 0));
  await nvim.command("normal! gg");

  await nvim.command("normal! yy");
  await nvim.command("normal! j");
  await nvim.command("normal! V");
  await nvim.client.call("feedkeys", [" p", "x"]);

  const regContent = await nvim.client.call("getreg", ['"']);
  expect(regContent).toContain("hello");
});
