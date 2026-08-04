import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { execa } from "execa";
import Herdr, { HerdrError } from "herdr-ts-sdk";

import type { TermBackend } from "./term/backend.ts";
import type { TermlessSession } from "./term/termless.ts";
import { createTermlessBackend } from "./term/termless.ts";

export interface HerdrTestSession {
  /** Unique session name (e2e-<uuid>). */
  name: string;
  /** Socket path of the isolated server. */
  socketPath: string;
  /** SDK client — control plane (setup, sync, semantic asserts). */
  client: Herdr;
  /** Emulator running the attached herdr client — data plane (rendering asserts). */
  term: TermlessSession;
  dispose(): Promise<void>;
}

export interface HerdrSessionOptions {
  cols?: number;
  rows?: number;
  cwd?: string;
  backend?: TermBackend;
  /** Recording label (usually the test name). */
  label?: string;
}

/**
 * Spawn an isolated herdr server + attached client for one test.
 *
 * `herdr --session <name>` starts a dedicated server (unique socket under
 * ~/.config/herdr/sessions/<name>/) and attaches the TUI in the emulator
 * PTY. Loads the real ~/.config/herdr/config.toml — tests assert this
 * dotfiles config, isolation is per-session, not per-config.
 */
export async function createHerdrSession(
  options: HerdrSessionOptions = {},
): Promise<HerdrTestSession> {
  const name = `e2e-${randomUUID().slice(0, 8)}`;
  const socketPath = path.join(homedir(), ".config", "herdr", "sessions", name, "herdr.sock");
  const backend = options.backend ?? createTermlessBackend();

  const term = (await backend.launch(["herdr", "--session", name], {
    cols: options.cols ?? 160,
    rows: options.rows ?? 45,
    cwd: options.cwd ?? process.cwd(),
    label: options.label ?? `herdr-${name}`,
  })) as TermlessSession;

  const deadline = Date.now() + 10_000;
  let socketReady = false;
  while (Date.now() < deadline) {
    try {
      await fs.access(socketPath);
      socketReady = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  if (!socketReady) {
    await term.dispose();
    throw new Error(`herdr session ${name}: socket never appeared at ${socketPath}`);
  }

  const client = new Herdr({ socketPath });
  await client.ping();

  return {
    name,
    socketPath,
    client,
    term,
    async dispose() {
      await term.dispose();
      await client.stop().catch((error: unknown) => {
        // The stopping server may close the socket before its ok response
        // lands (herdr's own CLI tolerates the same race). Only transport
        // drops are expected here — real server error replies propagate.
        if (error instanceof HerdrError) throw error;
      });
      // Deletion requires the server fully stopped — wait for its socket
      // to disappear before cleaning up (no socket API for deletion).
      const stopDeadline = Date.now() + 5_000;
      while (Date.now() < stopDeadline) {
        const gone = await fs.access(socketPath).then(
          () => false,
          () => true,
        );
        if (gone) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      await execa("herdr", ["session", "delete", name]);
    },
  };
}
