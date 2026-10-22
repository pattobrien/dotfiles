import { expect } from "vite-plus/test";

import type { NvimInstance } from "../../src/nvim.ts";
import { pollFor } from "../../src/term/backend.ts";

export async function key(nvim: NvimInstance, keys: string) {
  await nvim.client.lua("vim.api.nvim_input(...)", [keys]);
}

export async function mode(nvim: NvimInstance) {
  return (await nvim.client.lua("return vim.fn.mode()")) as string;
}

export async function appendAt(nvim: NvimInstance, line: number, col: number) {
  await nvim.client.request("nvim_win_set_cursor", [0, [line, col]]);
  await key(nvim, col === 0 ? "i" : "a");
  expect(await mode(nvim)).toBe("i");
}

export async function type(nvim: NvimInstance, text: string) {
  const indent = text.match(/^\s*/)?.[0] ?? "";
  if (indent) await key(nvim, indent);
  const words = text.trimStart().split(" ");
  for (const [i, word] of words.entries()) {
    await key(nvim, i < words.length - 1 ? `${word} ` : word);
  }
}

export async function openFile(nvim: NvimInstance, file: string) {
  await nvim.command(`edit ${file}`);
  expect(await nvim.client.lua("return vim.api.nvim_buf_get_name(0)")).toBe(
    file,
  );
  await key(nvim, "<Esc>");
  await pollFor(
    async () => (await nvim.client.lua("return vim.fn.getchar(1)")) === 0,
    "typeahead to drain after opening the file",
    10_000,
  );
}
