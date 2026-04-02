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
  const sockPath = `/tmp/nvim-e2e-${tmux.session}.sock`;
  const file = opts.file ?? `/tmp/nvim-e2e-${tmux.session}.txt`;

  // Clean up any stale socket
  await fs.rm(sockPath, { force: true });

  // Create an empty test file
  await fs.writeFile(file, "");

  // Launch nvim with RPC socket inside the tmux session
  await tmux.sendKeys(`nvim --listen ${sockPath} ${file}`, "Enter");

  // Wait for the socket file to appear (nvim is ready for RPC)
  await waitForFile(sockPath);

  // Connect via msgpack RPC
  const client = attach({ socket: sockPath });

  // Wait for the initial API handshake to complete
  await client._isReady;

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
