import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { expect } from "vite-plus/test";

import type { NvimInstance } from "../../src/nvim.ts";
import { pollFor } from "../../src/term/backend.ts";
import { test } from "../fixtures.ts";

const run = promisify(execFile);

const LONG_BULLET =
  "- first bullet that is long enough to wrap onto a second line and then even onto a third line when we keep typing more and more words here";

async function openMarkdown(nvim: NvimInstance, content: string) {
  const dir = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "nvim-md-prose-")),
  );
  const file = path.join(dir, "note.md");
  await fs.writeFile(file, content);
  await nvim.client.request("nvim_set_current_dir", [dir]);
  await nvim.command(`edit ${file}`);
  expect(await nvim.client.lua("return vim.bo.filetype")).toBe("markdown");
  expect(await nvim.client.lua("return vim.api.nvim_buf_get_name(0)")).toBe(
    file,
  );
  await key(nvim, "<Esc>");
  await pollFor(
    async () => (await nvim.client.lua("return vim.fn.getchar(1)")) === 0,
    "typeahead to drain after opening the file",
    10_000,
  );
  return dir;
}

async function appendAt(nvim: NvimInstance, line: number, col: number) {
  await nvim.client.request("nvim_win_set_cursor", [0, [line, col]]);
  await key(nvim, col === 0 ? "i" : "a");
  expect(await mode(nvim)).toBe("i");
}

async function key(nvim: NvimInstance, keys: string) {
  await nvim.client.lua("vim.api.nvim_input(...)", [keys]);
}

async function mode(nvim: NvimInstance) {
  return (await nvim.client.lua("return vim.fn.mode()")) as string;
}

async function type(nvim: NvimInstance, text: string) {
  const indent = text.match(/^\s*/)?.[0] ?? "";
  if (indent) await key(nvim, indent);
  const words = text.trimStart().split(" ");
  for (const [i, word] of words.entries()) {
    await key(nvim, i < words.length - 1 ? `${word} ` : word);
  }
}

async function oxfmt(dir: string, content: string) {
  const config = path.join(dir, ".oxfmtrc.json");
  const file = path.join(dir, "expected.md");
  await fs.writeFile(
    config,
    JSON.stringify({ printWidth: 80, proseWrap: "always" }),
  );
  await fs.writeFile(file, content);
  await run("oxfmt", ["-c", config, file]);
  return fs.readFile(file, "utf8");
}

test("typed prose, lists and quotes wrap exactly as oxfmt would", async ({
  nvim,
}) => {
  const dir = await openMarkdown(nvim, "# Title\n");
  await key(nvim, "o");
  expect(await mode(nvim)).toBe("i");
  await key(nvim, "<CR>");
  await type(nvim, LONG_BULLET);
  await key(nvim, "<CR>");
  await type(nvim, "- short");
  await key(nvim, "<CR>");
  await type(
    nvim,
    "  - nested bullet that is long enough to wrap onto a second line and then even onto a third line when we keep typing more",
  );
  await key(nvim, "<CR>");
  await type(nvim, "- sibling nested after a wrapped nested bullet");
  await key(nvim, "<CR><CR>");
  await type(
    nvim,
    "1. numbered item that is long enough to wrap onto a second line and then even onto a third line when we keep typing more and more words",
  );
  await key(nvim, "<CR><CR>");
  await type(
    nvim,
    "> quote that is long enough to wrap onto a second line and then even onto a third line when we keep typing more and more words",
  );
  await key(nvim, "<CR><CR>");
  await type(
    nvim,
    "A paragraph that is long enough to wrap onto a second line and then even onto a third line when we keep typing more and more words.",
  );
  await key(nvim, "<Esc>");

  const content = await nvim.getBufferContent();
  expect(content).toContain(
    "- first bullet that is long enough to wrap onto a second line and then even onto\n  a third line when we keep typing more and more words here\n- short\n  - nested bullet",
  );
  expect(content).toContain(
    "    onto a third line when we keep typing more\n  - sibling",
  );
  expect(content).toContain("\n1. numbered item");
  expect(content).toContain(
    "\n> quote that is long enough to wrap onto a second line and then even onto a\n> third line",
  );
  expect(await oxfmt(dir, `${content}\n`)).toBe(`${content}\n`);
});

test("editing the first line of a wrapped bullet reflows the whole item", async ({
  nvim,
}) => {
  const wrapped = [
    "- first list item that is also quite long and should wrap under the formatter",
    "  rules when it exceeds the width limit set here",
    "",
  ].join("\n");
  const dir = await openMarkdown(nvim, wrapped);
  await appendAt(nvim, 1, 78);
  await key(nvim, " ");
  await type(
    nvim,
    "and appended words to the bullet so that it must wrap again",
  );
  await key(nvim, "<Esc>");

  const content = await nvim.getBufferContent();
  expect(content).toBe(
    [
      "- first list item that is also quite long and should wrap under the formatter",
      "  and appended words to the bullet so that it must wrap again rules when it",
      "  exceeds the width limit set here",
    ].join("\n"),
  );
  expect(await oxfmt(dir, `${content}\n`)).toBe(`${content}\n`);
});

test("code fences and tables are never wrapped", async ({ nvim }) => {
  await openMarkdown(
    nvim,
    [
      "```ts",
      "const x = 1;",
      "```",
      "",
      "| a | b |",
      "| - | - |",
      "| c | d |",
      "",
    ].join("\n"),
  );
  await appendAt(nvim, 2, 11);
  await type(
    nvim,
    " // a trailing comment that is long enough to push this code line well past eighty columns",
  );
  await key(nvim, "<Esc>");
  await appendAt(nvim, 7, 4);
  await type(
    nvim,
    " a cell that is long enough to push this table row well past eighty columns",
  );
  await key(nvim, "<Esc>");

  const lines = (await nvim.getBufferContent()).split("\n");
  expect(lines[1]).toBe(
    "const x = 1; // a trailing comment that is long enough to push this code line well past eighty columns",
  );
  expect(lines[6]).toBe(
    "| c | a cell that is long enough to push this table row well past eighty columns d |",
  );
});

test("Enter after a wrapped bullet starts the next line at the bullet's column", async ({
  nvim,
}) => {
  await openMarkdown(
    nvim,
    [
      "- top level item that is long enough to wrap onto a second line when it is",
      "  typed in full",
      "  - nested item that is long enough to wrap onto a second line when it is",
      "    typed in full",
      "",
    ].join("\n"),
  );
  await appendAt(nvim, 2, 15);
  await key(nvim, "<CR>");
  await type(nvim, "- sibling");
  await key(nvim, "<Esc>");
  await appendAt(nvim, 5, 17);
  await key(nvim, "<CR>");
  await type(nvim, "- nested sibling");
  await key(nvim, "<Esc>");

  expect(await nvim.getBufferContent()).toBe(
    [
      "- top level item that is long enough to wrap onto a second line when it is",
      "  typed in full",
      "- sibling",
      "  - nested item that is long enough to wrap onto a second line when it is",
      "    typed in full",
      "  - nested sibling",
    ].join("\n"),
  );
});

test("a new bullet typed under a wrapped bullet is not merged into it", async ({
  nvim,
}) => {
  await openMarkdown(nvim, "");
  await key(nvim, "i");
  await type(nvim, LONG_BULLET);
  await key(nvim, "<CR>");
  await type(nvim, "1. numbered right below");
  await key(nvim, "<Esc>");

  expect(await nvim.getBufferContent()).toBe(
    [
      "- first bullet that is long enough to wrap onto a second line and then even onto",
      "  a third line when we keep typing more and more words here",
      "1. numbered right below",
    ].join("\n"),
  );
});
