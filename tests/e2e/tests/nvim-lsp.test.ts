import { expect } from "vite-plus/test";
import { test } from "./fixtures.ts";
import path from "node:path";
import type { NvimInstance } from "../src/nvim.ts";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "../fixtures/ts-project");

/** Wait for a non-copilot LSP client to attach to the current buffer. */
async function waitForLspClient(nvim: NvimInstance, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hasTs = await nvim.client.lua(
      'return #vim.tbl_filter(function(c) return c.name ~= "copilot" end, vim.lsp.get_clients({ bufnr = 0 })) > 0',
    );
    if (hasTs) break;
    await new Promise((r) => setTimeout(r, 100));
  }
}

// Combined worst-case polling (3s client + 3s diagnostics) can exceed the
// default 5s testTimeout, so give LSP tests a bit more headroom.
const LSP_TIMEOUT = 8_000;

test("diagnostics are visible in insert mode", { timeout: LSP_TIMEOUT }, async ({ nvim }) => {
  await nvim.command(`cd ${FIXTURE_DIR}`);
  await nvim.command(`edit ${FIXTURE_DIR}/error.ts`);

  await waitForLspClient(nvim);

  // Enter insert mode via RPC (deterministic, no fixed sleep)
  await nvim.input("i");
  const mode = await nvim.getMode();
  expect(mode).toBe("i");

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

test("hover shows type info", { timeout: LSP_TIMEOUT }, async ({ nvim }) => {
  await nvim.command(`cd ${FIXTURE_DIR}`);
  await nvim.command(`edit ${FIXTURE_DIR}/hover.ts`);

  await waitForLspClient(nvim);

  await nvim.command("normal! 2Gw");
  await nvim.input("K");

  await nvim.tmux.waitForText("string", 3);
  const pane = await nvim.tmux.capture();
  expect(pane).toContain("string");
});
