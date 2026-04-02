import type { NeovimClient } from "neovim";
import fs from "node:fs/promises";
import { type TmuxSession } from "./tmux.ts";

// The neovim npm package's Transport checks `NODE_ENV === 'test'` at import
// time and installs a special error handler that silently stops the msgpack
// decode loop on the first non-array message, causing the RPC client to hang
// forever.  Vitest sets NODE_ENV=test, which triggers this path.
//
// Workaround: dynamically import neovim with NODE_ENV temporarily unset.
async function neovimAttach(opts: { socket: string }): Promise<NeovimClient> {
  const saved = process.env.NODE_ENV;
  delete process.env.NODE_ENV;
  try {
    const { attach } = await import("neovim");
    return attach(opts);
  } finally {
    process.env.NODE_ENV = saved;
  }
}

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

  console.log("[nvim-debug] starting createNvimInstance");

  // Clean up any stale socket
  await fs.rm(sockPath, { force: true });

  // Create an empty test file
  await fs.writeFile(file, "");

  console.log("[nvim-debug] launching nvim in tmux");
  // Launch nvim with RPC socket inside the tmux session
  await tmux.sendKeys(`nvim --listen ${sockPath} ${file}`, "Enter");

  console.log("[nvim-debug] waiting for socket file");
  // Wait for the socket file to appear (nvim is ready for RPC)
  await waitForFile(sockPath, 5000);

  console.log("[nvim-debug] socket file found, attaching RPC client");
  // Connect via msgpack RPC and verify it works
  const client = await neovimAttach({ socket: sockPath });

  console.log("[nvim-debug] calling client.command to verify connection");
  // Ping nvim to confirm connection is live
  await client.command("echo ''");
  console.log("[nvim-debug] connection verified");

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

/** Gracefully quit nvim. */
export async function destroyNvimInstance(nvim: NvimInstance) {
  try {
    await nvim.client.command("qa!");
  } catch {
    // nvim may already be closed
  }
  nvim.client.quit();
}

/**
 * Pre-warm nvim plugins by running a headless Lazy restore.
 * Call once before the test suite (globalSetup).
 */
export async function prewarmNvimPlugins() {
  const { execaCommand } = await import("execa");
  await execaCommand('nvim --headless "+Lazy! restore" +qa', {
    shell: true,
    timeout: 60_000,
  });
}
