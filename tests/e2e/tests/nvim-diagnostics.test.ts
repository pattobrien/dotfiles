import path from "node:path";

import { execaCommand } from "execa";
import { expect } from "vite-plus/test";

import type { NvimInstance } from "../src/nvim.ts";

import { test } from "./fixtures.ts";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "../fixtures/ts-project");

/** Wait for a non-copilot LSP client to attach to the current buffer. */
async function waitForLspClient(nvim: NvimInstance, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hasTs = await nvim.client.lua(
      'return #vim.tbl_filter(function(c) return c.name ~= "copilot" end, vim.lsp.get_clients({ bufnr = 0 })) > 0',
    );
    if (hasTs) break;
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** Wait until the buffer has at least one diagnostic. */
async function waitForDiagnostic(nvim: NvimInstance, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const count = await nvim.client.lua("return #vim.diagnostic.get(0)");
    if (typeof count === "number" && count > 0) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}

/**
 * Capture the tmux pane WITH escape sequences (-e) so we can search for the
 * SGR codes nvim emits for undercurl + colored underline.
 */
async function capturePaneRaw(nvim: NvimInstance): Promise<string> {
  const { stdout } = await execaCommand(
    `tmux -L ${nvim.tmux.socket} capture-pane -t ${nvim.tmux.session} -pe`,
  );
  return stdout;
}

/**
 * The diagnostic line should be drawn as a red squiggle. We assert that on
 * the captured pane:
 *   - the undercurl SGR `\e[4:3m` appears (squiggle, not flat underline)
 *   - the underline-color SGR `\e[58;2;<r>;<g>;<b>m` appears with the
 *     palette's red channel — catppuccin mocha red lands at rgb(243, 139, 169)
 *     after the palette's hex parse.
 */
test(
  "diagnostic underline renders as red squiggle in terminal",
  { timeout: 15_000 },
  async ({ nvim }) => {
    await nvim.command(`cd ${FIXTURE_DIR}`);
    await nvim.command(`edit ${FIXTURE_DIR}/error.ts`);
    await waitForLspClient(nvim);
    await waitForDiagnostic(nvim);

    // Force a redraw so the diagnostic decoration is in the pane buffer.
    await nvim.client.lua("vim.cmd('redraw!')");

    const pane = await capturePaneRaw(nvim);

    const red = (await nvim.client.lua(`
      local C = require("catppuccin.palettes").get_palette("mocha")
      local n = tonumber((C.red:gsub("#", "")), 16)
      return { math.floor(n / 65536) % 256, math.floor(n / 256) % 256, n % 256 }
    `)) as [number, number, number];

    const UNDERCURL_SGR = "\x1b[4:3m";
    const RED_UNDERLINE_SGR = `\x1b[58;2;${red[0]};${red[1]};${red[2]}m`;

    expect(
      pane.includes(UNDERCURL_SGR),
      `pane should contain undercurl SGR (\\e[4:3m)`,
    ).toBe(true);

    expect(
      pane.includes(RED_UNDERLINE_SGR),
      `pane should contain catppuccin-red underline-color SGR (\\e[58;2;${red.join(";")}m)`,
    ).toBe(true);
  },
);
