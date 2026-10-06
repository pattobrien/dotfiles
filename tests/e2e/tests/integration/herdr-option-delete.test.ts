import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { PaneId } from "herdr-ts-sdk";
import { attach, type NeovimClient } from "neovim";
import { expect } from "vite-plus/test";
import { z } from "zod";

import type { HerdrTestSession } from "../../src/herdr.ts";
import { pollFor } from "../../src/term/backend.ts";
import { test } from "../fixtures.ts";

const KITTY_OPTION_BACKSPACE = "\x1b[127;3u\x1b[127;3:3u";
const KITTY_OPTION_DELETE = "\x1b[3;3~\x1b[3;3:3~";
const LEFT = "\x1b[D";
const CLAUDE_CODE_WORD_KILLS = [
  "ls ~/dev/foo_bar-",
  "ls ~/dev/foo_",
  "ls ~/dev/",
  "ls ~/",
  "",
];

const nvimTest = test.extend("paneNvim", async ({ herdr }, { onCleanup }) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "e2e-option-delete-"));
  const socket = path.join(dir, "nvim.sock");
  const file = path.join(dir, "scratch.txt");
  await herdr.term.waitFor(/\+/, 5_000);
  const pane = await herdr.client.panes.current();
  await herdr.client.panes.run(
    pane.id,
    `nvim --cmd 'set noswapfile' --listen ${socket} ${file}`,
  );
  await pollFor(
    () =>
      fs.access(socket).then(
        () => true,
        () => false,
      ),
    "nvim socket",
    10_000,
  );
  const client = attach({ socket });
  await pollFor(
    async () => (await client.call("maparg", ["<C-d>", "n"])) !== "",
    "LazyVim keymaps",
    10_000,
  );
  onCleanup(async () => {
    await client.close();
    await fs.rm(dir, { recursive: true, force: true });
  });
  return client;
});

async function untilChanged(read: () => Promise<unknown>, previous: string) {
  let current = previous;
  await pollFor(
    async () => {
      current = z.string().parse(await read());
      return current !== previous;
    },
    `change from ${JSON.stringify(previous)}`,
    2_000,
  );
  return current;
}

async function pressEach(
  herdr: HerdrTestSession,
  read: () => Promise<unknown>,
  start: string,
  times: number,
) {
  const seen: string[] = [];
  let current = start;
  for (let i = 0; i < times; i++) {
    herdr.term.type(KITTY_OPTION_BACKSPACE);
    current = await untilChanged(read, current);
    seen.push(current);
  }
  return seen;
}

nvimTest(
  "Option+Delete deletes words like Claude Code in insert mode",
  async ({ herdr, paneNvim }) => {
    await paneNvim.lua(`vim.api.nvim_set_current_line("ls ~/dev/foo_bar-baz")
      vim.cmd("startinsert!")`);
    await pollFor(async () => (await paneNvim.mode).mode === "i", "insert");
    const seen = await pressEach(
      herdr,
      () => paneNvim.call("getline", ["."]),
      "ls ~/dev/foo_bar-baz",
      CLAUDE_CODE_WORD_KILLS.length,
    );
    expect(seen).toEqual(CLAUDE_CODE_WORD_KILLS);
    expect((await paneNvim.mode).mode).toBe("i");
  },
);

nvimTest(
  "Option+Fn+Delete deletes to the line end in insert mode",
  async ({ herdr, paneNvim }) => {
    await paneNvim.lua(`vim.api.nvim_set_current_line("keep tail")
      vim.api.nvim_win_set_cursor(0, { 1, 4 })
      vim.cmd("startinsert")`);
    await pollFor(async () => (await paneNvim.mode).mode === "i", "insert");
    herdr.term.type(KITTY_OPTION_DELETE);
    const line = await untilChanged(
      () => paneNvim.call("getline", ["."]),
      "keep tail",
    );
    expect({ line, mode: (await paneNvim.mode).mode }).toEqual({
      line: "keep",
      mode: "i",
    });
  },
);

async function typeCmdline(paneNvim: NeovimClient, herdr: HerdrTestSession) {
  herdr.term.type(":echo foo_bar-baz");
  await pollFor(
    async () => (await paneNvim.call("getcmdline", [])) === "echo foo_bar-baz",
    "command line text",
  );
}

nvimTest(
  "Option+Delete deletes words like Claude Code on the command line",
  async ({ herdr, paneNvim }) => {
    await typeCmdline(paneNvim, herdr);
    const seen = await pressEach(
      herdr,
      () => paneNvim.call("getcmdline", []),
      "echo foo_bar-baz",
      2,
    );
    expect(seen).toEqual(["echo foo_bar-", "echo foo_"]);
  },
);

nvimTest(
  "Option+Fn+Delete deletes to the line end on the command line",
  async ({ herdr, paneNvim }) => {
    await typeCmdline(paneNvim, herdr);
    herdr.term.type(LEFT.repeat(4));
    await pollFor(
      async () => (await paneNvim.call("getcmdpos", [])) === 13,
      "cursor before -baz",
    );
    herdr.term.type(KITTY_OPTION_DELETE);
    expect(
      await untilChanged(
        () => paneNvim.call("getcmdline", []),
        "echo foo_bar-baz",
      ),
    ).toBe("echo foo_bar");
  },
);

const zshTest = test.extend("zshPane", async ({ herdr }) => {
  await herdr.term.waitFor(/\+/, 5_000);
  const pane = await herdr.client.panes.current();
  await herdr.client.panes.run(pane.id, "print E2E_READY");
  await pollFor(
    async () =>
      /^E2E_READY$/m.test((await herdr.client.panes.read(pane.id)).text),
    "zsh prompt",
    10_000,
  );
  return pane.id;
});

async function zshPrints(
  herdr: HerdrTestSession,
  paneId: PaneId,
  keys: string,
  marker: RegExp,
) {
  herdr.term.type(keys);
  herdr.term.type("\r");
  let output = "";
  await pollFor(
    async () => {
      output = (await herdr.client.panes.read(paneId)).text;
      return marker.test(output);
    },
    "zsh output",
    2_000,
  );
  return output.match(marker)?.[1];
}

zshTest(
  "Option+Delete deletes words like Claude Code in zsh vi insert mode",
  async ({ herdr, zshPane }) => {
    const printed = await zshPrints(
      herdr,
      zshPane,
      `echo E2E:dev/foo_bar-baz${KITTY_OPTION_BACKSPACE.repeat(2)}`,
      /^(E2E:\S*)$/m,
    );
    expect(printed).toBe("E2E:dev/foo_");
  },
);

zshTest(
  "Option+Fn+Delete deletes to the line end in zsh vi insert mode",
  async ({ herdr, zshPane }) => {
    const printed = await zshPrints(
      herdr,
      zshPane,
      `echo E2E:keepTAIL${LEFT.repeat(4)}${KITTY_OPTION_DELETE}`,
      /^(E2E:\S*)$/m,
    );
    expect(printed).toBe("E2E:keep");
  },
);
