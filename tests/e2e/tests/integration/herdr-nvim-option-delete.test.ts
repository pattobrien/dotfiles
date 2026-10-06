import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { attach, type NeovimClient } from "neovim";
import { expect } from "vite-plus/test";
import { z } from "zod";

import { pollFor } from "../../src/term/backend.ts";
import { test } from "../fixtures.ts";

const KITTY_OPTION_BACKSPACE = "\x1b[127;3u\x1b[127;3:3u";
const KITTY_OPTION_DELETE = "\x1b[3;3~\x1b[3;3:3~";

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

async function lineAfter(
  client: NeovimClient,
  setup: string,
  keys: string,
  type: (text: string) => void,
) {
  await client.lua(setup);
  await pollFor(async () => (await client.mode).mode === "i", "insert mode");
  type(keys);
  let line = "";
  await pollFor(
    async () => {
      line = z.string().parse(await client.call("getline", ["."]));
      return line !== "hello world";
    },
    "buffer edit",
    2_000,
  );
  return { line, mode: (await client.mode).mode };
}

nvimTest(
  "Option+Delete deletes the previous word in insert mode",
  async ({ herdr, paneNvim }) => {
    const result = await lineAfter(
      paneNvim,
      `vim.api.nvim_set_current_line("hello world")
       vim.cmd("startinsert!")`,
      KITTY_OPTION_BACKSPACE,
      (text) => herdr.term.type(text),
    );
    expect(result).toEqual({ line: "hello ", mode: "i" });
  },
);

nvimTest(
  "Option+Fn+Delete deletes the next word in insert mode",
  async ({ herdr, paneNvim }) => {
    const result = await lineAfter(
      paneNvim,
      `vim.api.nvim_set_current_line("hello world")
       vim.api.nvim_win_set_cursor(0, { 1, 0 })
       vim.cmd("startinsert")`,
      KITTY_OPTION_DELETE,
      (text) => herdr.term.type(text),
    );
    expect(result).toEqual({ line: "world", mode: "i" });
  },
);

nvimTest(
  "Option+Delete deletes the previous word on the command line",
  async ({ herdr, paneNvim }) => {
    herdr.term.type(":echo foo bar");
    await pollFor(
      async () => (await paneNvim.call("getcmdline", [])) === "echo foo bar",
      "command line text",
    );
    herdr.term.type(KITTY_OPTION_BACKSPACE);
    let cmdline = "";
    await pollFor(
      async () => {
        cmdline = z.string().parse(await paneNvim.call("getcmdline", []));
        return cmdline !== "echo foo bar";
      },
      "command line edit",
      2_000,
    );
    expect(cmdline).toBe("echo foo ");
  },
);
