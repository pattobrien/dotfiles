import path from "node:path";

import { expect } from "vite-plus/test";

import type { NvimInstance } from "../src/nvim.ts";

import { test } from "./fixtures.ts";

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

test(
  "diagnostics are visible in insert mode",
  { timeout: LSP_TIMEOUT },
  async ({ nvim }) => {
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
      diagCount = await nvim.client.lua("return #vim.diagnostic.get(0)");
      if (diagCount > 0) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(diagCount).toBeGreaterThan(0);
  },
);

test("hover shows type info", { timeout: LSP_TIMEOUT }, async ({ nvim }) => {
  await nvim.command(`cd ${FIXTURE_DIR}`);
  await nvim.command(`edit ${FIXTURE_DIR}/hover.ts`);

  await waitForLspClient(nvim);

  // Move cursor to "Promise" — deterministic regardless of line/column changes
  await nvim.client.lua('vim.fn.search("Promise")');

  // Retry hover until tsgo returns real type info (it may initially show
  // "No information available" while still indexing the file).
  const deadline = Date.now() + 5_000;
  let hoverContent = "";
  while (Date.now() < deadline) {
    // Close any existing hover floats, then trigger hover
    await nvim.client.lua(`
      for _, w in ipairs(vim.api.nvim_list_wins()) do
        pcall(function()
          if vim.api.nvim_win_get_config(w).relative ~= "" then
            vim.api.nvim_win_close(w, true)
          end
        end)
      end
    `);
    await nvim.input("K");
    await new Promise((r) => setTimeout(r, 300));

    // Read content from the first floating window
    hoverContent = await nvim.client.lua(`
      for _, w in ipairs(vim.api.nvim_list_wins()) do
        local ok, cfg = pcall(vim.api.nvim_win_get_config, w)
        if ok and cfg.relative ~= "" then
          local buf = vim.api.nvim_win_get_buf(w)
          local lines = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
          return table.concat(lines, "\\n")
        end
      end
      return ""
    `);
    if (hoverContent.includes("interface Promise")) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  expect(hoverContent, `hover popup content: "${hoverContent}"`).toContain(
    "interface Promise",
  );
});
