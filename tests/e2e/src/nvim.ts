import type { NeovimClient } from "neovim";
import { attach } from "neovim";
import fs from "node:fs/promises";
import { type TmuxSession } from "./tmux.ts";

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
async function waitForLazyVim(client: NeovimClient, timeoutMs = 10_000) {
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
async function waitForFile(path: string, timeoutMs = 3000) {
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

/**
 * Launch nvim inside a tmux session and connect via RPC.
 * Uses the real user config (~/.config/nvim).
 */
export async function createNvimInstance(
  tmux: TmuxSession,
  opts: { file?: string } = {},
): Promise<NvimInstance> {
  // Include tmux socket name (has PID) to avoid collisions across parallel workers
  const sockPath = `/tmp/nvim-e2e-${tmux.socket}-${tmux.session}.sock`;
  const file = opts.file ?? `/tmp/nvim-e2e-${tmux.socket}-${tmux.session}.txt`;

  // Clean up any stale socket and swap file from previous crashed runs
  await fs.rm(sockPath, { force: true });
  // nvim swap files live in ~/.local/state/nvim/swap/ with path-encoded names
  const swapName = file.replace(/\//g, "%") + ".swp";
  const swapPath = `${process.env.HOME}/.local/state/nvim/swap/${swapName}`;
  await fs.rm(swapPath, { force: true });

  // Create an empty test file
  await fs.writeFile(file, "");

  // Launch nvim with RPC socket inside the tmux session
  await tmux.sendKeys(`nvim --listen ${sockPath} ${file}`, "Enter");

  // Wait for the socket file to appear (nvim is ready for RPC).
  // With file-scoped fixtures this only happens once per test file.
  // Parallel workers each launch nvim + LazyVim simultaneously which can
  // take longer under load.
  await waitForFile(sockPath, 10_000);

  // Connect via msgpack RPC
  const client = attach({ socket: sockPath });

  // Wait for the initial API handshake to complete
  await client._isReady;

  // Wait for LazyVim plugins to finish loading. _isReady resolves early (before
  // VimEnter), so keymaps/plugins registered by LazyVim won't exist yet.
  await waitForLazyVim(client);

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

    async resetBuffer() {
      // Escape any mode, open a fresh empty buffer, and go to the top
      await client.input("<Esc>");
      await client.command("enew!");
      await client.command("normal! gg");
    },
  };
}

/** Gracefully quit nvim and close the socket connection. */
export async function destroyNvimInstance(nvim: NvimInstance) {
  // Send qa! via tmux sendKeys rather than RPC — avoids hanging if nvim is
  // already unresponsive or the socket is closed.
  await nvim.tmux.sendKeys("Escape", ":qa!", "Enter");
  // Close the RPC socket so the event loop is released.
  nvim.client.quit();
}
