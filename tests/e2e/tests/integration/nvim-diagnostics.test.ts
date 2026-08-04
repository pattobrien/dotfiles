import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { NeovimClient } from "neovim";
import { attach } from "neovim";
import { expect } from "vite-plus/test";

import { test } from "../fixtures.ts";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "../../fixtures/ts-project");

/** Wait for a non-copilot LSP client to attach to the current buffer. */
async function waitForLspClient(client: NeovimClient, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hasTs = await client.lua(
      'return #vim.tbl_filter(function(c) return c.name ~= "copilot" end, vim.lsp.get_clients({ bufnr = 0 })) > 0',
    );
    if (hasTs) break;
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** Wait until the buffer has at least one diagnostic. */
async function waitForDiagnostic(client: NeovimClient, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const count = await client.lua("return #vim.diagnostic.get(0)");
    if (typeof count === "number" && count > 0) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** Launch nvim inside the tmux pane and attach an RPC client to it. */
async function launchNvimInTmux(
  sendKeys: (...keys: string[]) => Promise<void>,
): Promise<NeovimClient> {
  const socket = path.join(os.tmpdir(), `nvim-e2e-tmux-${process.pid}.sock`);
  await fs.rm(socket, { force: true });
  await sendKeys(`nvim --cmd 'set noswapfile' --listen ${socket}`, "Enter");

  const deadline = Date.now() + 10_000;
  for (;;) {
    try {
      await fs.access(socket);
      break;
    } catch {
      if (Date.now() > deadline) throw new Error(`nvim socket never appeared at ${socket}`);
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  const client = attach({ socket });
  await client.apiInfo;

  // LazyVim setup is complete once keymaps.lua (VeryLazy) has remapped <C-d>.
  const lazyDeadline = Date.now() + 20_000;
  while (Date.now() < lazyDeadline) {
    try {
      if (await client.call("maparg", ["<C-d>", "n"])) break;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  return client;
}

/**
 * tmux is part of the system under test here: the tmux-256color terminfo
 * override (Smulx/Setulc) is what lets nvim's undercurl survive tmux —
 * without it, nvim degrades the squiggle to a flat underline. The assert
 * reads tmux's own pane state (capture-pane -e), so what is verified is
 * exactly what tmux forwards to the outer terminal:
 *   - the undercurl SGR `\e[4:3m` appears (squiggle, not flat underline)
 *   - the underline-color SGR `\e[58;2;<r>;<g>;<b>m` appears with the
 *     palette's red channel — catppuccin mocha red lands at rgb(243, 139, 169)
 *     after the palette's hex parse.
 */
test(
  "diagnostic underline renders as red squiggle through tmux",
  { timeout: 60_000 },
  async ({ tmux }) => {
    const client = await launchNvimInTmux(tmux.sendKeys);

    try {
      await client.command(`cd ${FIXTURE_DIR}`);
      await client.command(`edit ${FIXTURE_DIR}/error.ts`);
      await waitForLspClient(client);
      await waitForDiagnostic(client);

      // Force a redraw so the diagnostic decoration is in the pane buffer.
      await client.command("redraw!");

      const pane = await tmux.captureRaw();

      const red = (await client.lua(`
        local C = require("catppuccin.palettes").get_palette("mocha")
        local n = tonumber((C.red:gsub("#", "")), 16)
        return { math.floor(n / 65536) % 256, math.floor(n / 256) % 256, n % 256 }
      `)) as [number, number, number];

      const UNDERCURL_SGR = "\x1b[4:3m";
      const RED_UNDERLINE_SGR = `\x1b[58;2;${red[0]};${red[1]};${red[2]}m`;

      expect(pane.includes(UNDERCURL_SGR), `pane should contain undercurl SGR (\\e[4:3m)`).toBe(
        true,
      );

      expect(
        pane.includes(RED_UNDERLINE_SGR),
        `pane should contain catppuccin-red underline-color SGR (\\e[58;2;${red.join(";")}m)`,
      ).toBe(true);
    } finally {
      // The worker-scoped tmux fixture kills the server (and this nvim
      // inside it) on teardown; no RPC quit needed.
      client.quit();
    }
  },
);
