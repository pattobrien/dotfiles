import path from "node:path";

import { expect } from "vite-plus/test";

import type { NvimInstance } from "../src/nvim.ts";

import { test } from "./fixtures.ts";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "../fixtures/ts-project");

/** Wait for the copilot LSP client to attach to the current buffer. */
async function waitForCopilot(nvim: NvimInstance, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const present = await nvim.client.lua(
      'return #vim.tbl_filter(function(c) return c.name == "copilot" end, vim.lsp.get_clients({ bufnr = 0 })) > 0',
    );
    if (present) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Timed out waiting for LSP client "copilot"');
}

/**
 * Check sidekick's load state WITHOUT require()-ing any sidekick module —
 * lazy.nvim's module loader would load the plugin as a side effect and mask
 * lazy-loading bugs (sidekick's NES autocmds only register once it loads).
 */
async function sidekickLoaded(nvim: NvimInstance): Promise<boolean> {
  const loaded = await nvim.client.lua(`
    local p = require("lazy.core.config").plugins["sidekick.nvim"]
    return p ~= nil and p._.loaded ~= nil
  `);
  return loaded === true;
}

test(
  "copilot shows a basic inline ghost-text completion",
  { timeout: 12_000 },
  async ({ nvim }) => {
    await nvim.command(`cd ${FIXTURE_DIR}`);
    await nvim.command(`edit ${FIXTURE_DIR}/nes.ts`);
    await waitForCopilot(nvim);

    // Start an obvious continuation at the end of the file and stay in
    // insert mode — ghost text renders as extmarks in the
    // "nvim.lsp.inline_completion" namespace while inserting.
    await nvim.input("Goconst fourth = ");

    const deadline = Date.now() + 3_000;
    let shown = false;
    while (Date.now() < deadline) {
      shown =
        (await nvim.client.lua(`
          local ns = vim.api.nvim_get_namespaces()["nvim.lsp.inline_completion"]
          if not ns then return false end
          return #vim.api.nvim_buf_get_extmarks(0, ns, 0, -1, {}) > 0
        `)) === true;
      if (shown) break;
      await new Promise((r) => setTimeout(r, 250));
    }

    if (!shown) {
      const status = await nvim.client.lua(
        'local ok, s = pcall(function() return require("sidekick.status").get() end); return ok and vim.inspect(s) or "unavailable"',
      );
      const messages = await nvim.client.lua(
        'return vim.fn.execute("messages")',
      );
      throw new Error(
        `No inline completion ghost text within 3s.\n  copilot status: ${String(status)}\n  :messages tail: ${String(messages).slice(-500)}`,
      );
    }

    await nvim.input("<Esc>");
    await nvim.command("silent! edit!");
    expect(shown).toBe(true);
  },
);

test(
  "blink ghost text stays disabled (copilot owns ghost text)",
  { timeout: 12_000 },
  async ({ nvim }) => {
    await nvim.command(`cd ${FIXTURE_DIR}`);
    await nvim.command(`edit ${FIXTURE_DIR}/nes.ts`);
    await waitForCopilot(nvim);

    // Type a prefix that opens the blink menu (getUserName is in scope).
    // With blink ghost text enabled, the selected item's remainder renders
    // in front of copilot's inline completion — two ghost texts stacked.
    await nvim.input("GogetUser");

    const deadline = Date.now() + 3_000;
    let menuVisible = false;
    while (Date.now() < deadline) {
      menuVisible =
        (await nvim.client.lua(
          'return require("blink.cmp").is_menu_visible()',
        )) === true;
      if (menuVisible) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(menuVisible, "blink completion menu never opened").toBe(true);

    const blinkGhostMarks = await nvim.client.lua(`
      local ns = vim.api.nvim_get_namespaces()["blink_cmp_ghost_text"]
      if not ns then return 0 end
      return #vim.api.nvim_buf_get_extmarks(0, ns, 0, -1, {})
    `);
    expect(
      blinkGhostMarks,
      "blink is rendering its own ghost text on top of copilot's",
    ).toBe(0);

    await nvim.input("<Esc>");
    await nvim.command("silent! edit!");
  },
);

test(
  "sidekick.nvim loads when editing a file (no keypress required)",
  { timeout: 12_000 },
  async ({ nvim }) => {
    await nvim.command(`cd ${FIXTURE_DIR}`);
    await nvim.command(`edit ${FIXTURE_DIR}/nes.ts`);
    await waitForCopilot(nvim);

    // NES fires on edit events, so sidekick must be loaded by the time a
    // file is open — not only after one of its own keymaps is pressed.
    const deadline = Date.now() + 3_000;
    let loaded = false;
    while (Date.now() < deadline) {
      loaded = await sidekickLoaded(nvim);
      if (loaded) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(
      loaded,
      "sidekick.nvim never loaded — NES autocmds are not registered, so " +
        "next-edit suggestions can never trigger",
    ).toBe(true);
  },
);

test(
  "NES produces a next-edit suggestion after a rename edit",
  // The first NES request after a cold nvim boot can exceed the 3s window
  // (Copilot backend warmup); the retry always hits a warm server.
  { timeout: 12_000, retry: 1 },
  async ({ nvim }) => {
    await nvim.command(`cd ${FIXTURE_DIR}`);
    await nvim.command(`edit ${FIXTURE_DIR}/nes.ts`);
    await waitForCopilot(nvim);

    // Rename the function at its declaration; NES should propose updating
    // the call sites below. Leaving insert mode ("ModeChanged i:n") is one
    // of NES's trigger events.
    await nvim.client.lua('vim.fn.cursor(1, 1); vim.fn.search("getUserName")');
    await nvim.input("ciwgetUserLabel<Esc>");

    // Poll for a pending suggestion. Requires sidekick to already be loaded
    // (previous test asserts that) and the Copilot backend to respond.
    const deadline = Date.now() + 3_000;
    let have = false;
    while (Date.now() < deadline) {
      have = (await nvim.client.lua(
        'return require("sidekick.nes").have()',
      )) === true;
      if (have) break;
      await new Promise((r) => setTimeout(r, 250));
    }

    if (!have) {
      // Surface Copilot status to distinguish "not signed in" from "broken".
      const status = await nvim.client.lua(
        'local ok, s = pcall(function() return require("sidekick.status").get() end); return ok and vim.inspect(s) or "unavailable"',
      );
      const messages = await nvim.client.lua(
        'return vim.fn.execute("messages")',
      );
      throw new Error(
        `No NES suggestion within 3s.\n  copilot status: ${String(status)}\n  :messages tail: ${String(messages).slice(-500)}`,
      );
    }

    // A suggestion exists — applying it must succeed and change the buffer.
    const before = await nvim.getBufferContent();
    const applied = await nvim.client.lua(
      'return require("sidekick.nes").apply() ~= nil',
    );
    expect(applied, "Nes.apply() reported no edits applied").toBe(true);
    const after = await nvim.getBufferContent();
    expect(after).not.toBe(before);

    // Don't leave the fixture file modified on disk (buffer is never :written,
    // but make the intent explicit if reset semantics ever change).
    await nvim.command("silent! edit!");
  },
);
