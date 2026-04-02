import { expect } from "vitest";
import { test } from "./fixtures.ts";

test("diagnostics are visible in insert mode", { timeout: 20_000 }, async ({ nvim }) => {
  // Write a TypeScript file with an error
  const file = `/tmp/nvim-e2e-lsp-${Date.now()}.ts`;
  const { writeFile } = await import("node:fs/promises");
  await writeFile(file, 'const x: number = "not a number";\n');

  await nvim.command(`edit ${file}`);

  // Wait for tsgo LSP to attach and produce diagnostics
  await nvim.tmux.waitForText("tsgo", 15);

  // Enter insert mode
  await nvim.input("A");

  const mode = await nvim.getMode();
  expect(mode).toBe("i");

  // Check that diagnostics are shown (update_in_insert = true)
  const diagnostics = (await nvim.client.call("vim.diagnostic.get", [
    0,
  ])) as unknown[];
  expect(diagnostics.length).toBeGreaterThan(0);
});

test("hover shows type info", { timeout: 20_000 }, async ({ nvim }) => {
  const file = `/tmp/nvim-e2e-hover-${Date.now()}.ts`;
  const { writeFile } = await import("node:fs/promises");
  await writeFile(file, "const greeting: string = 'hello';\nconsole.log(greeting);\n");

  await nvim.command(`edit ${file}`);

  // Wait for tsgo LSP to attach
  await nvim.tmux.waitForText("tsgo", 15);

  // Move cursor to "greeting" on line 2 and trigger hover
  await nvim.command("normal! 2Gw");
  await nvim.input("K");

  // Wait for hover popup to render
  await nvim.tmux.waitForText("string", 3);

  const pane = await nvim.tmux.capture();
  expect(pane).toContain("string");
});
