import path from "node:path";

import { expect } from "vite-plus/test";

import type { NvimInstance } from "../../src/nvim.ts";

import { test } from "../fixtures.ts";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "../../fixtures/ts-project");

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

/** Wait for a specific LSP client (by name) to attach to the current buffer. */
async function waitForNamedLspClient(nvim: NvimInstance, name: string, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const present = await nvim.client.lua(
      `return #vim.tbl_filter(function(c) return c.name == "${name}" end, vim.lsp.get_clients({ bufnr = 0 })) > 0`,
    );
    if (present) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timed out waiting for LSP client "${name}"`);
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
    const raw = await nvim.client.lua("return #vim.diagnostic.get(0)");
    diagCount = typeof raw === "number" ? raw : 0;
    if (diagCount > 0) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  expect(diagCount).toBeGreaterThan(0);
});

test("hover shows type info", { timeout: LSP_TIMEOUT }, async ({ nvim }) => {
  await nvim.command(`cd ${FIXTURE_DIR}`);
  await nvim.command(`edit ${FIXTURE_DIR}/hover.ts`);

  await waitForLspClient(nvim);

  // Move cursor to "Promise" — deterministic regardless of line/column changes
  await nvim.client.call("search", ["Promise"]);

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
    const raw = await nvim.client.lua(`
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
    hoverContent = typeof raw === "string" ? raw : "";
    if (hoverContent.includes("interface Promise")) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  expect(hoverContent, `hover popup content: "${hoverContent}"`).toContain("interface Promise");
});

/**
 * Setup, not assertion: a freshly-attached tsgo answers definition requests
 * with only the local import binding until cross-module resolution warms up.
 * Poll a raw textDocument/definition request (bypassing gd's UI) until the
 * server resolves ZodString into zod's node_modules types, so the test
 * below exercises a single gd press against a ready server.
 */
async function waitForDefinitionResolution(nvim: NvimInstance, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const resolved = await nvim.client.lua(`
      local params = vim.lsp.util.make_position_params(0, "utf-8")
      local results = vim.lsp.buf_request_sync(0, "textDocument/definition", params, 1000)
      for _, res in pairs(results or {}) do
        local defs = res.result
        if defs then
          if defs.uri or defs.targetUri then defs = { defs } end
          for _, d in ipairs(defs) do
            local uri = d.uri or d.targetUri or ""
            if uri:find("node_modules", 1, true) and uri:find("/zod/", 1, true) then
              return true
            end
          end
        end
      end
      return false
    `);
    if (resolved === true) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("tsgo never resolved ZodString into node_modules/zod");
}

test(
  "gd jumps to definition of an imported type used in a type alias",
  { timeout: 30_000 },
  async ({ nvim }) => {
    await nvim.command(`cd ${FIXTURE_DIR}`);
    await nvim.command(`edit ${FIXTURE_DIR}/device.ts`);

    // tsgo attaches noticeably later than oxlint — wait for it specifically,
    // otherwise gd fires before the TS server is ready to answer.
    await waitForNamedLspClient(nvim, "tsgo");

    // Land on `ZodString` in `export type Schema = ZodString;` — the
    // `ZodString;` pattern only occurs in the type-alias line, never the import.
    await nvim.client.call("cursor", [1, 1]);
    await nvim.client.call("search", ["ZodString;"]);

    // Sanity-check cursor placement before triggering gd.
    const wordUnderCursor = await nvim.client.call("expand", ["<cword>"]);
    expect(wordUnderCursor).toBe("ZodString");

    await waitForDefinitionResolution(nvim);

    // LazyVim's LSP `gd` is a buffer-local mapping applied on LspAttach —
    // it can lag behind the client becoming visible to get_clients. Until
    // it lands, `gd` falls through to the built-in goto-local-declaration
    // (which just jumps to the import binding), so wait for the mapping.
    const mapDeadline = Date.now() + 5_000;
    let gdMapped = false;
    while (Date.now() < mapDeadline) {
      // Stays Lua: the maparg dict holds a Lua callback, which msgpack-rpc
      // can't serialize — only the boolean crosses the wire.
      gdMapped = (await nvim.client.lua(
        'return not vim.tbl_isempty(vim.fn.maparg("gd", "n", false, true))',
      )) as boolean;
      if (gdMapped) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(gdMapped, "LSP gd mapping never attached to the buffer").toBe(true);

    await nvim.input("gd");

    // gd must land in zod's published types inside node_modules. Depending
    // on how many definitions tsgo reports (interface + const vs a deduped
    // single result), Snacks either jumps directly or opens the
    // "Lsp Definitions" picker — confirm the first entry when it appears.
    const deadline = Date.now() + 5_000;
    let curBuf = "";
    let lastConfirm = 0;
    while (Date.now() < deadline) {
      curBuf = await nvim.client.buffer.then((b) => b.name);
      if (curBuf.includes("/node_modules/") && curBuf.includes("/zod/")) break;
      // Re-send while the picker stays visible: a <CR> that races the
      // picker's input mount is silently dropped.
      if (nvim.term.text().includes("Lsp Definitions") && Date.now() - lastConfirm > 500) {
        lastConfirm = Date.now();
        await nvim.input("<CR>");
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(curBuf, `current buffer after gd: "${curBuf}"`).toMatch(/\/node_modules\/.*\/zod\//);
  },
);
