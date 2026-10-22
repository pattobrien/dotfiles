import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect } from "vite-plus/test";

import type { NvimInstance } from "../../src/nvim.ts";
import { test } from "../fixtures.ts";

import { appendAt, key, openFile, type } from "./nvim-keys.ts";

const repoNodeModules = path.resolve(
  import.meta.dirname,
  "../../../../node_modules",
);

async function workspace(files: Record<string, string>) {
  const dir = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "nvim-print-width-")),
  );
  await fs.symlink(repoNodeModules, path.join(dir, "node_modules"));
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(dir, name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  }
  return dir;
}

function widths(nvim: NvimInstance) {
  return nvim.client.lua(
    "return { width = vim.b.print_width, textwidth = vim.bo.textwidth, ruler = vim.wo.colorcolumn }",
  );
}

async function expectWidths(
  nvim: NvimInstance,
  expected: { width?: number; textwidth: number; ruler: string },
) {
  await expect.poll(() => widths(nvim), { timeout: 15_000 }).toEqual(expected);
}

test("fmt.printWidth from vite.config.ts drives textwidth, wrapping and the ruler", async ({
  nvim,
}) => {
  const dir = await workspace({
    "vite.config.ts":
      'export default { fmt: { printWidth: 100, proseWrap: "always" } };\n',
    "note.md": "# Title\n",
    "app.ts": "export const x = 1;\n",
  });
  await openFile(nvim, path.join(dir, "app.ts"));
  await expectWidths(nvim, { width: 100, textwidth: 0, ruler: "100" });

  await openFile(nvim, path.join(dir, "note.md"));
  await expectWidths(nvim, { width: 100, textwidth: 100, ruler: "100" });
  await appendAt(nvim, 1, 7);
  await key(nvim, "<CR><CR>");
  await type(
    nvim,
    "- a bullet that runs past eighty columns but stays under one hundred columns so it must not wrap yet and then keeps going",
  );
  await key(nvim, "<Esc>");

  const lines = (await nvim.getBufferContent()).split("\n");
  expect(lines[2]).toBe(
    "- a bullet that runs past eighty columns but stays under one hundred columns so it must not wrap yet",
  );
  expect(lines[3]).toBe("  and then keeps going");
});

test("a nested vite.config.ts without fmt defers to the parent config", async ({
  nvim,
}) => {
  const dir = await workspace({
    "vite.config.ts": "export default { fmt: { printWidth: 100 } };\n",
    "nested/vite.config.ts": "export default { test: {} };\n",
    "nested/note.md": "# Title\n",
  });
  await openFile(nvim, path.join(dir, "nested/note.md"));
  await expectWidths(nvim, { width: 100, textwidth: 100, ruler: "100" });
});

test(".oxfmtrc.json printWidth applies, and buffers without a config keep the defaults", async ({
  nvim,
}) => {
  const dir = await workspace({
    ".oxfmtrc.json": '{ "printWidth": 60 }\n',
    "note.md": "# Title\n",
  });
  await openFile(nvim, path.join(dir, "note.md"));
  await expectWidths(nvim, { width: 60, textwidth: 60, ruler: "60" });

  const plain = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "nvim-print-width-plain-")),
  );
  await fs.writeFile(path.join(plain, "note.md"), "# Title\n");
  await openFile(nvim, path.join(plain, "note.md"));
  await expectWidths(nvim, { textwidth: 80, ruler: "80" });
});

test(".oxfmtrc.jsonc with comments and trailing commas applies its printWidth", async ({
  nvim,
}) => {
  const dir = await workspace({
    ".oxfmtrc.jsonc": [
      "// formatter config",
      "{",
      '  "proseWrap": "always", // wrap prose',
      '  "overrides": [{ "files": ["*.ts"], "options": { "printWidth": 40 } }],',
      '  "printWidth": 65,',
      "}",
      "",
    ].join("\n"),
    "note.md": "# Title\n",
  });
  await openFile(nvim, path.join(dir, "note.md"));
  await expectWidths(nvim, { width: 65, textwidth: 65, ruler: "65" });
});

test("an .editorconfig max_line_length drives the ruler when no formatter config exists", async ({
  nvim,
}) => {
  const dir = await workspace({
    ".editorconfig": "root = true\n[*]\nmax_line_length = 70\n",
    "note.md": "# Title\n",
    "app.ts": "export const x = 1;\n",
  });
  await openFile(nvim, path.join(dir, "note.md"));
  await expectWidths(nvim, { width: 70, textwidth: 70, ruler: "70" });
  await openFile(nvim, path.join(dir, "app.ts"));
  await expectWidths(nvim, { width: 70, textwidth: 70, ruler: "70" });
});
