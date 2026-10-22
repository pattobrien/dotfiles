import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect } from "vite-plus/test";

import type { NvimInstance } from "../../src/nvim.ts";
import { test } from "../fixtures.ts";

import { appendAt, key, mode, openFile, type } from "./nvim-keys.ts";

async function openMarkdown(nvim: NvimInstance, lines: string[]) {
  const dir = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "nvim-bullets-")),
  );
  const file = path.join(dir, "note.md");
  await fs.writeFile(file, lines.join("\n"));
  await openFile(nvim, file);
  expect(await nvim.client.lua("return vim.bo.filetype")).toBe("markdown");
}

test("Enter continues dash and numbered lists, and clears an unused bullet", async ({
  nvim,
}) => {
  await openMarkdown(nvim, [""]);
  await key(nvim, "i");
  await type(nvim, "- first");
  await key(nvim, "<CR>");
  await type(nvim, "second");
  await key(nvim, "<CR><CR><CR>");
  await type(nvim, "1. one");
  await key(nvim, "<CR>");
  await type(nvim, "two");
  await key(nvim, "<CR><CR>");
  await type(nvim, "done");
  await key(nvim, "<Esc>");

  expect(await nvim.getBufferContent()).toBe(
    ["- first", "- second", "", "1. one", "2. two", "done"].join("\n"),
  );
});

test("Enter at the end of a wrapped bullet starts a sibling bullet", async ({
  nvim,
}) => {
  await openMarkdown(nvim, [
    "- top level item that is long enough to wrap onto a second line when it is",
    "  continued in full",
    "  - nested item that is long enough to wrap onto a second line when it is",
    "    continued in full",
    "",
  ]);
  await appendAt(nvim, 2, 19);
  await key(nvim, "<CR>");
  await type(nvim, "sibling");
  await key(nvim, "<Esc>");
  await appendAt(nvim, 5, 21);
  await key(nvim, "<CR>");
  await type(nvim, "nested sibling");
  await key(nvim, "<Esc>");

  expect(await nvim.getBufferContent()).toBe(
    [
      "- top level item that is long enough to wrap onto a second line when it is",
      "  continued in full",
      "- sibling",
      "  - nested item that is long enough to wrap onto a second line when it is",
      "    continued in full",
      "  - nested sibling",
    ].join("\n"),
  );
});

test("o opens a new bullet, Ctrl-T nests it keeping the dash marker, Ctrl-D unnests", async ({
  nvim,
}) => {
  await openMarkdown(nvim, ["- parent", ""]);
  await nvim.client.request("nvim_win_set_cursor", [0, [1, 0]]);
  await key(nvim, "o");
  expect(await mode(nvim)).toBe("i");
  await key(nvim, "<C-t>");
  await type(nvim, "child");
  await key(nvim, "<CR>");
  await key(nvim, "<C-d>");
  await type(nvim, "next parent");
  await key(nvim, "<Esc>");

  expect(await nvim.getBufferContent()).toBe(
    ["- parent", "  - child", "- next parent"].join("\n"),
  );
});

test("leader cb toggles a task checkbox", async ({ nvim }) => {
  await openMarkdown(nvim, ["- [ ] task", ""]);
  await nvim.client.request("nvim_win_set_cursor", [0, [1, 0]]);
  await key(nvim, " cb");
  await expect
    .poll(() => nvim.getBufferContent(), { timeout: 3_000 })
    .toBe("- [x] task");
  await key(nvim, " cb");
  await expect
    .poll(() => nvim.getBufferContent(), { timeout: 3_000 })
    .toBe("- [ ] task");
});
