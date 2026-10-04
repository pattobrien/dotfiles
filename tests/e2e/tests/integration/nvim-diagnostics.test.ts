import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { NeovimClient } from "neovim";
import { attach } from "neovim";
import { expect } from "vite-plus/test";

import { test } from "../fixtures.ts";

const FIXTURE_DIR = path.resolve(
  import.meta.dirname,
  "../../fixtures/ts-project",
);

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

/**
 * Launch nvim at a shell prompt inside the multiplexer under test and attach
 * an RPC client to it. `runCommand` types the command and presses Enter.
 */
async function launchNvim(
  runCommand: (command: string) => Promise<void>,
): Promise<NeovimClient> {
  const socket = path.join(
    os.tmpdir(),
    `nvim-e2e-${randomUUID().slice(0, 8)}.sock`,
  );
  await runCommand(`nvim --cmd 'set noswapfile' --listen ${socket}`);

  const deadline = Date.now() + 5_000;
  for (;;) {
    try {
      await fs.access(socket);
      break;
    } catch {
      if (Date.now() > deadline)
        throw new Error(`nvim socket never appeared at ${socket}`);
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  const client = attach({ socket });
  await client.apiInfo;

  // LazyVim setup is complete once keymaps.lua (VeryLazy) has remapped <C-d>.
  const lazyDeadline = Date.now() + 5_000;
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

/** Open the fixture's error.ts, wait for its diagnostic, and force a redraw. */
async function openErrorFile(client: NeovimClient) {
  await client.command(`cd ${FIXTURE_DIR}`);
  await client.command(`edit ${FIXTURE_DIR}/error.ts`);
  await waitForLspClient(client);
  await waitForDiagnostic(client);
  // Force a redraw so the diagnostic decoration reaches the multiplexer.
  await client.command("redraw!");
}

const ESC = "\x1b";
const UNDERCURL_SGR = new RegExp(`${ESC}\\[(?:[0-9;:]*;)?4:3[;m]`);

/**
 * Assert the multiplexer forwarded nvim's diagnostic underline to the outer
 * terminal as a (red) squiggle:
 *   - an SGR carrying the `4:3` undercurl parameter appears (squiggle, not flat
 *     underline); tmux emits it standalone, herdr merges it with the colours
 *   - an underline-color SGR `\e[58...m` appears with the palette's red
 *     channel — catppuccin mocha red lands at rgb(243, 139, 169) after the
 *     palette's hex parse. Multiplexers re-encode the parameters (`;` vs `:`,
 *     optional empty colorspace slot), so only the numbers are pinned.
 */
async function expectSquiggle(
  client: NeovimClient,
  readOutput: () => Promise<string>,
  { color }: { color: boolean },
) {
  const red = (await client.lua(`
      local C = require("catppuccin.palettes").get_palette("mocha")
      local n = tonumber((C.red:gsub("#", "")), 16)
      return { math.floor(n / 65536) % 256, math.floor(n / 256) % 256, n % 256 }
    `)) as [number, number, number];
  const redUnderline = new RegExp(
    `\\x1b\\[58[;:]2[;:]{1,2}${red[0]}[;:]${red[1]}[;:]${red[2]}m`,
  );

  // The redraw reaches the outer terminal asynchronously.
  const deadline = Date.now() + 3_000;
  let output = await readOutput();
  while (!UNDERCURL_SGR.test(output) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
    output = await readOutput();
  }

  const seen = [
    ...new Set(output.match(new RegExp(`${ESC}\\[[0-9;:]*m`, "g")) ?? []),
  ]
    .filter((sgr) => /(^|[;[])4[:;m]|58[;:]/.test(sgr))
    .map((sgr) => JSON.stringify(sgr))
    .join(" ");
  expect(
    UNDERCURL_SGR.test(output),
    `output should contain an SGR with the 4:3 undercurl parameter; underline SGRs seen: ${seen || "none"}`,
  ).toBe(true);
  if (!color) return;
  expect(
    redUnderline.test(output),
    `output should contain catppuccin-red underline-color SGR (\\e[58;2;${red.join(";")}m)`,
  ).toBe(true);
}

/**
 * tmux is part of the system under test here: the tmux-256color terminfo
 * override (Smulx/Setulc, compiled by scripts/setup_tmux.zsh) is what lets
 * nvim's undercurl survive tmux — without it, nvim degrades the squiggle to
 * a flat underline. The assert reads tmux's own pane state (capture-pane -e),
 * so what is verified is exactly what tmux forwards to the outer terminal.
 */
test(
  "diagnostic underline renders as red squiggle through tmux",
  { timeout: 20_000 },
  async ({ tmux }) => {
    const client = await launchNvim((command) =>
      tmux.sendKeys(command, "Enter"),
    );

    try {
      await openErrorFile(client);
      await expectSquiggle(client, () => tmux.captureRaw(), { color: true });
    } finally {
      // The worker-scoped tmux fixture kills the server (and this nvim
      // inside it) on teardown; no RPC quit needed.
      client.quit();
    }
  },
);

/**
 * herdr is part of the system under test here: it hard-codes
 * TERM=xterm-256color in its panes and never answers nvim's DECRQSS undercurl
 * probe, so nvim only emits SGR 4:3 / 58 when the xterm-256color terminfo
 * override (compiled by scripts/setup_herdr.zsh) is in ~/.terminfo. The
 * assert reads what the attached herdr client draws into the emulator, i.e.
 * exactly what herdr forwards to the outer terminal.
 */
test(
  "diagnostic underline renders as squiggle through herdr",
  { timeout: 20_000 },
  async ({ herdr }) => {
    const { client: herdrClient, term } = herdr;
    await term.waitFor(/\+/, 5_000);

    const pane = await herdrClient.panes.current();
    const client = await launchNvim((command) =>
      herdrClient.panes.run(pane.id, command),
    );

    try {
      await openErrorFile(client);
      // herdr drops underline colour on its server→client wire (CellData has no
      // underline-colour field, build_sgr never emits 58), so only the curl is
      // asserted here.
      await expectSquiggle(client, async () => term.raw(), { color: false });
    } finally {
      // The test-scoped herdr fixture stops the server (and this nvim inside
      // it) on cleanup; no RPC quit needed.
      client.quit();
    }
  },
);
