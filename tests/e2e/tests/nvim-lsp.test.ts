import { expect } from "vite-plus/test";
import { test } from "./fixtures.ts";

test("diagnostics are visible in insert mode", { timeout: 45_000 }, async ({ nvim }) => {
  await nvim.resetBuffer();
  // Write a TypeScript file with an error
  const file = `/tmp/nvim-e2e-lsp-${Date.now()}.ts`;
  const { writeFile } = await import("node:fs/promises");
  await writeFile(file, 'const x: number = "not a number";\n');

  await nvim.command(`edit ${file}`);

  // Wait for an LSP client to attach via RPC (instead of checking tmux pane text)
  const lspDeadline = Date.now() + 30_000;
  while (Date.now() < lspDeadline) {
    const count = await nvim.client.lua(
      "return #vim.lsp.get_clients({ bufnr = 0 })",
    ) as number;
    if (count > 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  // Enter insert mode via tmux (real keystroke, not queued like feedkeys)
  await nvim.tmux.sendKeys("i");
  // Wait for mode change to propagate
  await new Promise((r) => setTimeout(r, 200));

  // Poll for diagnostics via Lua (vim.diagnostic.get is a Lua function, not vimscript)
  const diagDeadline = Date.now() + 15_000;
  let diagCount = 0;
  while (Date.now() < diagDeadline) {
    diagCount = await nvim.client.lua(
      "return #vim.diagnostic.get(0)",
    ) as number;
    if (diagCount > 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  expect(diagCount).toBeGreaterThan(0);
});

test("hover shows type info", { timeout: 30_000 }, async ({ nvim }) => {
  await nvim.resetBuffer();
  const file = `/tmp/nvim-e2e-hover-${Date.now()}.ts`;
  const { writeFile } = await import("node:fs/promises");
  await writeFile(file, "const greeting: string = 'hello';\nconsole.log(greeting);\n");

  await nvim.command(`edit ${file}`);

  // Wait for an LSP client to attach via RPC
  const lspDeadline = Date.now() + 20_000;
  while (Date.now() < lspDeadline) {
    const count = await nvim.client.lua(
      "return #vim.lsp.get_clients({ bufnr = 0 })",
    ) as number;
    if (count > 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  // Move cursor to "greeting" on line 2 and trigger hover
  await nvim.command("normal! 2Gw");
  await nvim.input("K");

  // Wait for hover popup to render
  await nvim.tmux.waitForText("string", 5);

  const pane = await nvim.tmux.capture();
  expect(pane).toContain("string");
});
