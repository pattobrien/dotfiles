import type { NeovimClient } from "neovim";
import { attach } from "neovim";
import fs from "node:fs/promises";
import { type TmuxSession } from "./tmux.ts";

const NVIM_SOCKET = "/tmp/nvim-e2e.sock";

export interface NvimInstance {
  /** The neovim RPC client. */
  client: NeovimClient;
  /** The tmux session nvim is running in. */
  tmux: TmuxSession;

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
}

/**
 * Wait for LazyVim's VeryLazy event to fire.
 * keymaps.lua loads on VeryLazy — once <C-d> is remapped, setup is complete.
 */
async function waitForLazyVim(client: NeovimClient, timeoutMs = 15_000) {
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
async function waitForFile(path: string, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fs.access(path);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  throw new Error(`Timed out waiting for file: ${path}`);
}

/** Check if the persistent nvim socket file exists. */
async function nvimSocketExists(): Promise<boolean> {
  try {
    await fs.access(NVIM_SOCKET);
    return true;
  } catch {
    return false;
  }
}

function buildNvimInstance(client: NeovimClient, tmux: TmuxSession): NvimInstance {
  return {
    client,
    tmux,

    async getBufferContent() {
      const buf = await client.buffer;
      const lines = await buf.lines;
      return (lines as string[]).join("\n");
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
      // Return to normal mode, close everything: popups, floats, explorer, pickers.
      await client.input("<Esc>");
      await client.command("silent! pclose | cclose | lclose");
      // Close snacks explorer/picker if open
      await client.lua("pcall(function() Snacks.explorer.close() end)");
      // Close any floating windows
      await client.lua("for _, w in ipairs(vim.api.nvim_list_wins()) do if vim.api.nvim_win_get_config(w).relative ~= '' then pcall(vim.api.nvim_win_close, w, true) end end");
      // Close all splits back to one window
      await client.command("silent! only!");
      const bufName = testName ? `test-${testName}` : `test-${Date.now()}`;
      await client.command("enew!");
      await client.command(`file ${bufName}`);
      await client.command("setlocal buftype=nofile bufhidden=wipe");
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
        return {
          mode = vim.api.nvim_get_mode().mode,
          win_count = #wins - floats,
          float_count = floats,
          cursor = vim.api.nvim_win_get_cursor(0),
          bufname = vim.api.nvim_buf_get_name(0),
          line_count = vim.api.nvim_buf_line_count(0),
          first_line = vim.api.nvim_buf_get_lines(0, 0, 1, false)[1] or "",
        }
      `)) as {
        mode: string;
        win_count: number;
        float_count: number;
        cursor: [number, number];
        bufname: string;
        line_count: number;
        first_line: string;
      };

      if (state.mode !== "n") violations.push(`mode: expected 'n', got '${state.mode}'`);
      if (state.win_count !== 1) violations.push(`windows: expected 1, got ${state.win_count}`);
      if (state.float_count > 0) violations.push(`floats: expected 0, got ${state.float_count}`);
      if (state.line_count > 1) violations.push(`lines: expected 1, got ${state.line_count}`);
      if (state.first_line !== "") violations.push(`buffer not empty: '${state.first_line}'`);

      return violations;
    },
  };
}

/**
 * Get or create a persistent nvim instance inside the tmux session.
 * On first run: launches nvim + waits for LazyVim (~2s). On subsequent runs: instant.
 * The nvim instance is intentionally left alive after tests finish.
 */
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
 * Get or create a persistent nvim instance inside the tmux session.
 * On first run: launches nvim + waits for LazyVim (~2s). On subsequent runs: instant.
 * The nvim instance is intentionally left alive after tests finish.
 */
export async function getOrCreateNvimInstance(
  tmux: TmuxSession,
): Promise<NvimInstance> {
  // Try connecting to existing nvim socket
  if (await nvimSocketExists()) {
    try {
      const client = attach({ socket: NVIM_SOCKET });
      await client._isReady;
      await ensureHomeBuffer(client);
      return buildNvimInstance(client, tmux);
    } catch {
      // Socket exists but nvim is dead — clean up and launch fresh
      await fs.rm(NVIM_SOCKET, { force: true });
    }
  }

  // Launch nvim in the tmux session
  await tmux.sendKeys(`nvim --listen ${NVIM_SOCKET}`, "Enter");

  // Wait for socket + RPC handshake + LazyVim
  await waitForFile(NVIM_SOCKET);
  const client = attach({ socket: NVIM_SOCKET });
  await client._isReady;
  await waitForLazyVim(client);
  await ensureHomeBuffer(client);

  return buildNvimInstance(client, tmux);
}

/** Disconnect the RPC client (does NOT kill nvim — it stays alive for next run). */
export function disconnectNvim(_nvim: NvimInstance) {
  // Intentionally a no-op. The socket connection gets cleaned up when the
  // vitest worker process exits. Calling client.quit() kills nvim, and
  // transport.close() causes "Premature close" unhandled rejections.
  // The persistent nvim instance survives for the next test run.
}
