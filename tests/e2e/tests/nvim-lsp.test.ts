import { expect } from "vite-plus/test";
import { test, useNvimStateGuard } from "./fixtures.ts";
import path from "node:path";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "../fixtures/ts-project");

useNvimStateGuard();

test("diagnostics are visible in insert mode", async ({ nvim }) => {
  await nvim.command(`cd ${FIXTURE_DIR}`);
  await nvim.command(`edit ${FIXTURE_DIR}/error.ts`);

  // Wait for tsgo (not copilot) to attach
  const lspDeadline = Date.now() + 3_000;
  while (Date.now() < lspDeadline) {
    const hasTs = await nvim.client.lua(
      'return #vim.tbl_filter(function(c) return c.name ~= "copilot" end, vim.lsp.get_clients({ bufnr = 0 })) > 0',
    );
    if (hasTs) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  // Enter insert mode
  await nvim.tmux.sendKeys("i");
  await new Promise((r) => setTimeout(r, 200));

  // Poll for diagnostics
  const diagDeadline = Date.now() + 3_000;
  let diagCount = 0;
  while (Date.now() < diagDeadline) {
    diagCount = (await nvim.client.lua("return #vim.diagnostic.get(0)")) as number;
    if (diagCount > 0) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  expect(diagCount).toBeGreaterThan(0);
});

test("hover shows type info", async ({ nvim }) => {
  await nvim.command(`cd ${FIXTURE_DIR}`);
  await nvim.command(`edit ${FIXTURE_DIR}/hover.ts`);

  // Wait for tsgo to attach
  const lspDeadline = Date.now() + 3_000;
  while (Date.now() < lspDeadline) {
    const hasTs = await nvim.client.lua(
      'return #vim.tbl_filter(function(c) return c.name ~= "copilot" end, vim.lsp.get_clients({ bufnr = 0 })) > 0',
    );
    if (hasTs) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  await nvim.command("normal! 2Gw");
  await nvim.input("K");

  await nvim.tmux.waitForText("string", 3);
  const pane = await nvim.tmux.capture();
  expect(pane).toContain("string");
});
