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
  resetBuffer: () => Promise<void>;
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

/** Check if the persistent nvim socket exists and is connectable. */
async function nvimIsRunning(): Promise<boolean> {
  try {
    await fs.access(NVIM_SOCKET);
    // Socket file exists — try a quick RPC ping to verify nvim is alive.
    // We connect, check the mode, then destroy the socket (NOT client.quit()
    // which sends a quit command to nvim itself).
    const client = attach({ socket: NVIM_SOCKET });
    await client._isReady;
    await client.mode;
    // Close the socket without killing nvim
    const transport = (client as any).transport;
    transport?.reader?.destroy?.();
    transport?.writer?.destroy?.();
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
      // Return to normal mode, close popups/floats, wipe current buffer, start fresh.
      await client.input("<Esc>");
      await client.command("silent! pclose | cclose | lclose");
      await client.lua("for _, w in ipairs(vim.api.nvim_list_wins()) do if vim.api.nvim_win_get_config(w).relative ~= '' then vim.api.nvim_win_close(w, true) end end");
      // Create new scratch buffer first, THEN wipe the old one.
      // bwipeout on the last buffer would exit nvim.
      const oldBuf = await client.call("bufnr", ["%"]) as number;
      const bufName = testName ? `test-${testName}` : `test-${Date.now()}`;
      await client.command("enew!");
      await client.command(`file ${bufName}`);
      await client.command("setlocal buftype=nofile bufhidden=wipe");
      if (oldBuf > 0) {
        await client.command(`silent! ${oldBuf}bwipeout!`);
      }
      await client.command("normal! gg");
    },
  };
}

/**
 * Get or create a persistent nvim instance inside the tmux session.
 * On first run: launches nvim + waits for LazyVim (~2s). On subsequent runs: instant.
 * The nvim instance is intentionally left alive after tests finish.
 */
export async function getOrCreateNvimInstance(
  tmux: TmuxSession,
): Promise<NvimInstance> {
  // Try connecting to existing nvim
  if (await nvimIsRunning()) {
    const client = attach({ socket: NVIM_SOCKET });
    await client._isReady;
    return buildNvimInstance(client, tmux);
  }

  // Clean up stale socket
  await fs.rm(NVIM_SOCKET, { force: true });

  // Launch nvim in the tmux session
  await tmux.sendKeys(`nvim --listen ${NVIM_SOCKET}`, "Enter");

  // Wait for socket + RPC handshake + LazyVim
  await waitForFile(NVIM_SOCKET);
  const client = attach({ socket: NVIM_SOCKET });
  await client._isReady;
  await waitForLazyVim(client);

  return buildNvimInstance(client, tmux);
}

/** Disconnect the RPC client (does NOT kill nvim — it stays alive for next run). */
export function disconnectNvim(_nvim: NvimInstance) {
  // Intentionally a no-op. The socket connection gets cleaned up when the
  // vitest worker process exits. Calling client.quit() kills nvim, and
  // transport.close() causes "Premature close" unhandled rejections.
  // The persistent nvim instance survives for the next test run.
}
