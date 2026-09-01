import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { execa } from "execa";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import type { NvimInstance } from "../../src/nvim.ts";
import { pollFor } from "../../src/term/backend.ts";
import { test } from "../fixtures.ts";

interface PickerState {
  hidden: boolean;
  preview_valid: boolean;
  list_h: number;
  root_w: number;
  /** Finder total (all sources, deduped) — independent of the query. */
  count: number;
  /** Items matching the current query. */
  matched: number;
  /** Basenames of the matched items, in list order. */
  files: string[];
  /** Match scores of the matched items (frecency/cwd/score_add bonuses included). */
  scores: number[];
  pattern: string;
  /** Pattern the finder last ran with — differs from `pattern` if no refresh fired. */
  finder_pattern: string;
  /** Finder item counts keyed by multi-source index (1 = recent, 2 = files). */
  by_source: Record<string, number>;
  busy: boolean;
}

const FILES = [
  "alpha_one.ts",
  "alpha_two.ts",
  "gamma.ts",
  "notes.beta.md",
  "sub/beta.md",
  ...Array.from(
    { length: 27 },
    (_, i) => `filler_${String(i + 1).padStart(2, "0")}.ts`,
  ),
];

let repo: string;

beforeAll(async () => {
  repo = await fs.mkdtemp(path.join(os.tmpdir(), "e2e-picker-"));
  await execa("git", ["init"], { cwd: repo });
  await fs.mkdir(path.join(repo, "sub"));
  await Promise.all(
    FILES.map((f) =>
      fs.writeFile(path.join(repo, f), `export const x = "${f}";\n`),
    ),
  );
});

afterAll(async () => {
  await fs.rm(repo, { recursive: true, force: true });
});

async function pickerState(nvim: NvimInstance): Promise<PickerState | null> {
  return (await nvim.client.lua(`
    local p = Snacks.picker.get({ tab = false })[1]
    if not p then return nil end
    local preview = p.layout.wins and p.layout.wins.preview
    local items = p:items()
    local by_source = vim.empty_dict()
    for _, it in ipairs(p.finder.items) do
      local k = tostring(it.source_id or 0)
      by_source[k] = (by_source[k] or 0) + 1
    end
    local files, scores = {}, {}
    for i, item in ipairs(items) do
      files[i] = vim.fn.fnamemodify(item.file, ":t")
      scores[i] = item.score
    end
    return {
      hidden = p.layout:is_hidden("preview"),
      preview_valid = preview ~= nil and preview:valid() or false,
      list_h = vim.api.nvim_win_get_height(p.list.win.win),
      root_w = vim.api.nvim_win_get_width(p.layout.root.win),
      count = p:count(),
      matched = p.list:count(),
      files = files,
      scores = scores,
      pattern = p.input.filter.pattern,
      finder_pattern = p.finder.filter and p.finder.filter.pattern or "<nil>",
      by_source = by_source,
      busy = p.finder:running() or p.matcher:running(),
    }
  `)) as PickerState | null;
}

/**
 * Poll until `picker:find()` has run for `pattern` and finder + matcher are
 * idle. Typing sets `input.filter.pattern` synchronously but schedules the
 * `find()` behind a 30ms throttle, so `finder.filter.pattern` (stored by
 * `finder:init`) is the signal that the picker actually processed the input.
 */
async function settled(nvim: NvimInstance, pattern = ""): Promise<PickerState> {
  let state: PickerState | null = null;
  await pollFor(
    async () => {
      state = await pickerState(nvim);
      return (
        state !== null &&
        state.pattern === pattern &&
        state.finder_pattern === pattern &&
        !state.busy
      );
    },
    `picker idle with pattern "${pattern}"`,
    3_000,
  );
  return state!;
}

/**
 * `LazyVim.root()` resolves `.git` from the current buffer's path, and the
 * fixture's `test-*` scratch buffer was named under the dotfiles checkout —
 * so tests that haven't `:edit`ed a repo file first must start from an
 * unnamed buffer (`enew`) for the root to fall back to cwd.
 */
async function openPicker(
  nvim: NvimInstance,
  { scratch = false } = {},
): Promise<PickerState> {
  await nvim.command(`cd ${repo}`);
  if (scratch) await nvim.command("enew");
  await nvim.input(" ff");
  await nvim.term.waitFor("Smart", 3_000);
  return settled(nvim);
}

async function closePicker(nvim: NvimInstance) {
  for (let attempt = 0; attempt < 2; attempt++) {
    await nvim.input("<Esc>");
    try {
      await pollFor(
        async () =>
          (await nvim.client.lua(
            "return #Snacks.picker.get({ tab = false })",
          )) === 0,
        "picker to close",
        1_000,
      );
      return;
    } catch {
      // <Esc> may have only left insert mode — retry once.
    }
  }
  throw new Error("picker did not close after two <Esc>");
}

test("leader-ff opens the smart picker without a preview window", async ({
  nvim,
}) => {
  try {
    const s = await openPicker(nvim, { scratch: true });
    expect(s.hidden, JSON.stringify(s)).toBe(true);
    expect(s.preview_valid, JSON.stringify(s)).toBe(false);
  } finally {
    await closePicker(nvim);
  }
});

test("picker list shows at most 20 rows and is ~64% wide", async ({ nvim }) => {
  try {
    const s = await openPicker(nvim, { scratch: true });
    expect(s.list_h, JSON.stringify(s)).toBe(20);
    expect(s.root_w, JSON.stringify(s)).toBe(128);
  } finally {
    await closePicker(nvim);
  }
});

test("empty search lists only recently opened files, excluding the current one", async ({
  nvim,
}) => {
  await nvim.command(`cd ${repo}`);
  await nvim.command("edit alpha_two.ts");
  await nvim.command("edit gamma.ts");
  try {
    const s = await openPicker(nvim);
    expect(
      s.count,
      `current file gamma.ts is excluded: ${JSON.stringify(s)}`,
    ).toBe(1);
    expect(s.files, JSON.stringify(s)).toEqual(["alpha_two.ts"]);
    expect(nvim.term.text()).not.toContain("filler_01.ts");
  } finally {
    await closePicker(nvim);
  }
});

test("typing a query searches all repo files", async ({ nvim }) => {
  try {
    await openPicker(nvim, { scratch: true });
    await nvim.input("filler_1");
    const s = await settled(nvim, "filler_1");
    expect(s.matched, JSON.stringify(s)).toBeGreaterThan(0);
    await nvim.term.waitFor("filler_19.ts", 3_000);
    const screen = nvim.term.text();
    expect(screen, JSON.stringify(s)).toContain("filler_10.ts");
    expect(screen, JSON.stringify(s)).toContain("filler_19.ts");
  } finally {
    await closePicker(nvim);
  }
});

test("recently opened file ranks first for a query", async ({ nvim }) => {
  await nvim.command(`cd ${repo}`);
  await nvim.command("edit alpha_two.ts");
  await nvim.command("edit gamma.ts");
  try {
    await openPicker(nvim);
    await nvim.input("alpha");
    const s = await settled(nvim, "alpha");
    expect(s.files[0], JSON.stringify(s)).toBe("alpha_two.ts");
    expect(
      s.by_source["1"],
      `must come from the recent source: ${JSON.stringify(s)}`,
    ).toBeGreaterThanOrEqual(1);
    expect(
      s.scores[0],
      `recent boost applied: ${JSON.stringify(s)}`,
    ).toBeGreaterThan(1000);
    expect(s.files[1], JSON.stringify(s)).toBe("alpha_one.ts");

    // The boost must not leak recent files into queries they don't match.
    await nvim.client.lua(`
      local p = Snacks.picker.get({ tab = false })[1]
      p.input:set("filler_2")
      p:find()
    `);
    const f = await settled(nvim, "filler_2");
    expect(f.files[0], JSON.stringify(f)).toMatch(/^filler_2\d\.ts$/);
    expect(f.files, JSON.stringify(f)).not.toContain("alpha_two.ts");
    expect(f.files, JSON.stringify(f)).not.toContain("gamma.ts");
  } finally {
    await closePicker(nvim);
  }
});

/**
 * `getbufinfo().lastused` has one-second resolution and Neovim's main loop
 * keeps refreshing it for the current buffer, so stay in each file until the
 * clock ticks — otherwise two files opened back to back tie and the recent
 * order between them is undefined.
 */
async function editAndTick(nvim: NvimInstance, file: string) {
  await nvim.command(`edit ${file}`);
  const entered = (await nvim.client.lua("return os.time()")) as number;
  await pollFor(
    async () =>
      ((await nvim.client.lua("return os.time()")) as number) > entered,
    `clock to tick after opening ${file}`,
    2_000,
  );
}

test("recent files rank by recency and keep that order as the query grows", async ({
  nvim,
}) => {
  await nvim.command(`cd ${repo}`);
  await editAndTick(nvim, "sub/beta.md");
  await editAndTick(nvim, "notes.beta.md");
  await nvim.command("edit gamma.ts");
  try {
    await openPicker(nvim);
    let query = "";
    for (const ch of "beta") {
      query += ch;
      await nvim.input(ch);
      const s = await settled(nvim, query);
      expect(
        s.files.slice(0, 2),
        `query "${query}": ${JSON.stringify(s)}`,
      ).toEqual(["notes.beta.md", "beta.md"]);
    }
  } finally {
    await closePicker(nvim);
  }
}, 10_000);

test("clearing the query goes back to recent files only", async ({ nvim }) => {
  await nvim.command(`cd ${repo}`);
  await nvim.command("edit alpha_two.ts");
  await nvim.command("edit gamma.ts");
  try {
    await openPicker(nvim);
    await nvim.input("filler");
    await settled(nvim, "filler");
    // <C-u> in the picker input is list_scroll_up, so clear over RPC.
    await nvim.client.lua(`
      local p = Snacks.picker.get({ tab = false })[1]
      p.input:set("")
      p:find()
    `);
    const s = await settled(nvim);
    expect(
      s.count,
      `current file gamma.ts is excluded: ${JSON.stringify(s)}`,
    ).toBe(1);
    expect(s.files, JSON.stringify(s)).toEqual(["alpha_two.ts"]);
  } finally {
    await closePicker(nvim);
  }
});
