import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { NeovimClient } from "neovim";
import { attach } from "neovim";

import { createTermlessBackend } from "./term/termless.ts";
import type { TermlessSession } from "./term/termless.ts";

/**
 * Root of the checkout this test suite runs from — nvim's cwd. Resolved
 * relative to this file so worktree checkouts test themselves, not the
 * main clone.
 */
export const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");

export interface NvimInstance {
  /** The neovim RPC client — control plane. */
  client: NeovimClient;
  /** The emulator session nvim renders into — data plane. */
  term: TermlessSession;

  /** Get the current buffer text as a string. */
  getBufferContent: () => Promise<string>;
  /** Get the cursor position as [line, col] (1-indexed). */
  getCursorPosition: () => Promise<[number, number]>;
  /** Get the current mode (e.g., "n", "i", "v"). */
  getMode: () => Promise<string>;
  /** Execute an ex command. */
  command: (cmd: string) => Promise<void>;
  /** Send keys as if typed (uses nvim_input). */
  input: (keys: string) => Promise<void>;
  /** Reset to a fresh empty buffer in normal mode. */
  resetBuffer: (testName?: string) => Promise<void>;
  /** Check nvim is in expected start state. Returns list of violations. */
  checkStartState: () => Promise<string[]>;
  /** Shut down nvim and the emulator session. */
  dispose: () => Promise<void>;
}

/**
 * Wait for LazyVim's VeryLazy event to fire.
 * keymaps.lua loads on VeryLazy — once <C-d> is remapped, setup is complete.
 */
async function waitForLazyVim(client: NeovimClient, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const remap = await client.call("maparg", ["<C-d>", "n"]);
      if (remap) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Timed out waiting for LazyVim (keymaps not loaded after VeryLazy)");
}

/** Wait for a file to exist on disk. */
async function waitForFile(filePath: string, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fs.access(filePath);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  throw new Error(`Timed out waiting for file: ${filePath}`);
}

function buildNvimInstance(client: NeovimClient, term: TermlessSession): NvimInstance {
  return {
    client,
    term,

    async getBufferContent() {
      const buf = await client.buffer;
      const lines = await buf.lines;
      return lines.join("\n");
    },

    async getCursorPosition() {
      const win = await client.window;
      const [line, col] = await win.cursor;
      return [line, col];
    },

    async getMode() {
      const mode = await client.mode;
      return mode.mode;
    },

    async command(cmd: string) {
      await client.command(cmd);
    },

    async input(keys: string) {
      await client.input(keys);
    },

    async resetBuffer(testName?: string) {
      // Force normal mode (works from any mode including terminal)
      await client.input("<C-\\><C-n>");
      // Close everything: popups, floats, explorer, pickers, splits
      await client.command("silent! pclose | cclose | lclose");
      await client.lua("pcall(function() Snacks.explorer.close() end)");
      await client.lua(
        "for _, w in ipairs(vim.api.nvim_list_wins()) do pcall(function() if vim.api.nvim_win_get_config(w).relative ~= '' then vim.api.nvim_win_close(w, true) end end) end",
      );
      await client.command("silent! only!");
      // Create new scratch buffer
      const bufName = testName ? `test-${testName}` : `test-${Date.now()}`;
      await client.command("enew!");
      await client.command(`file ${bufName}`);
      await client.command("setlocal buftype=nofile bufhidden=wipe");
      // Wipe stale buffers (keep e2e-home, hover.ts, and current test buffer)
      await client.lua(`
        local dominated = { "e2e-home", "hover.ts" }
        local dominated_set = {}
        for _, n in ipairs(dominated) do dominated_set[n] = true end
        local cur = vim.api.nvim_get_current_buf()
        for _, b in ipairs(vim.api.nvim_list_bufs()) do
          if b ~= cur and vim.api.nvim_buf_is_loaded(b) then
            local name = vim.fn.fnamemodify(vim.api.nvim_buf_get_name(b), ":t")
            local home = vim.g._e2e_home_buf
            if b ~= home and not dominated_set[name] then
              pcall(vim.api.nvim_buf_delete, b, { force = true })
            end
          end
        end
      `);
      // Clear registers and search state to prevent cross-test pollution
      await client.lua(`
        vim.fn.setreg('"', "")
        vim.fn.setreg('0', "")
        vim.cmd("let @/ = ''")
        vim.cmd("nohlsearch")
      `);
      // Restore cwd to the checkout root
      await client.command(`cd ${REPO_ROOT}`);
      await client.command("normal! gg");
    },

    async checkStartState() {
      const violations: string[] = [];
      const state = (await client.lua(`
        local wins = vim.api.nvim_list_wins()
        local floats = 0
        for _, w in ipairs(wins) do
          if vim.api.nvim_win_get_config(w).relative ~= "" then floats = floats + 1 end
        end

        -- Collect all listed buffer names
        local bufs = {}
        for _, b in ipairs(vim.api.nvim_list_bufs()) do
          if vim.api.nvim_buf_is_loaded(b) and vim.bo[b].buflisted then
            local name = vim.fn.fnamemodify(vim.api.nvim_buf_get_name(b), ":t")
            if name == "" then name = "[No Name]" end
            table.insert(bufs, name)
          end
        end

        return {
          mode = vim.api.nvim_get_mode().mode,
          win_count = #wins - floats,
          float_count = floats,
          cursor = vim.api.nvim_win_get_cursor(0),
          cur_buf = vim.fn.fnamemodify(vim.api.nvim_buf_get_name(0), ":t"),
          line_count = vim.api.nvim_buf_line_count(0),
          first_line = vim.api.nvim_buf_get_lines(0, 0, 1, false)[1] or "",
          cwd = vim.fn.getcwd(),
          listed_bufs = bufs,
        }
      `)) as {
        mode: string;
        win_count: number;
        float_count: number;
        cursor: [number, number];
        cur_buf: string;
        line_count: number;
        first_line: string;
        cwd: string;
        listed_bufs: string[];
      };

      if (state.mode !== "n") violations.push(`mode: expected 'n', got '${state.mode}'`);
      if (state.win_count !== 1) violations.push(`windows: expected 1, got ${state.win_count}`);
      if (state.float_count > 0) violations.push(`floats: expected 0, got ${state.float_count}`);
      if (state.line_count > 1)
        violations.push(`lines: expected 1 empty line, got ${state.line_count}`);
      if (state.first_line !== "") violations.push(`buffer not empty: '${state.first_line}'`);

      // Only e2e-home and hover.ts should be listed
      const allowed = new Set(["e2e-home", "hover.ts"]);
      // Current scratch buffer is also fine (test-* names get wiped via bufhidden)
      const stale = state.listed_bufs.filter((b) => !allowed.has(b) && !b.startsWith("test-"));
      if (stale.length > 0) violations.push(`stale buffers: ${stale.join(", ")}`);

      // cwd should be the checkout root
      if (state.cwd !== REPO_ROOT) {
        violations.push(`cwd: expected '${REPO_ROOT}', got '${state.cwd}'`);
      }

      return violations;
    },

    async dispose() {
      // No explicit quit: disposing the emulator kills nvim's PTY, and
      // quitting over RPC only produces teardown noise (the channel dies
      // mid-request as a *result* of the quit).
      await term.dispose();
    },
  };
}

/**
 * Create a permanent unlisted buffer that is never closed.
 * This ensures bwipeout! in resetBuffer can never kill the last buffer.
 */
async function ensureHomeBuffer(client: NeovimClient) {
  await client.lua(`
    if not vim.g._e2e_home_buf then
      local buf = vim.api.nvim_create_buf(false, true)
      vim.api.nvim_buf_set_name(buf, "e2e-home")
      vim.bo[buf].buftype = "nofile"
      vim.bo[buf].bufhidden = "hide"
      vim.g._e2e_home_buf = buf
    end
  `);
}

/**
 * Launch a fresh nvim under an emulator PTY (worker-scoped: one per test
 * run, disposed on worker exit). RPC control plane over a unique socket;
 * screen assertions read the emulator. noswapfile: the instance is
 * disposable, and a stale swap from a killed run blocks startup on a
 * recovery dialog.
 */
export async function launchNvimInstance(): Promise<NvimInstance> {
  const socket = path.join(os.tmpdir(), `nvim-e2e-${process.pid}.sock`);
  await fs.rm(socket, { force: true });

  const term = (await createTermlessBackend().launch(
    ["nvim", "--cmd", "set noswapfile", "--listen", socket],
    {
      cols: 200,
      rows: 50,
      cwd: REPO_ROOT,
      label: "nvim",
    },
  )) as TermlessSession;

  await waitForFile(socket);
  const client = attach({ socket });
  await client.apiInfo;
  await waitForLazyVim(client);
  await ensureHomeBuffer(client);

  return buildNvimInstance(client, term);
}
