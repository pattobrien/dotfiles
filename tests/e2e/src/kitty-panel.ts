import fs from "node:fs/promises";

import { execa } from "execa";

/**
 * Real-kitty os-panel fixture for rendered-pixel assertions.
 *
 * Occluded kitty OS windows freeze their screencapture frames, so the test
 * window is created as an os-panel with layer=top (always composited above
 * everything) and focus-policy=not-allowed. The panel must never be focused
 * or raised — all interaction goes through kitty remote control and the
 * SUT's own control plane (herdr SDK socket).
 */

const PANEL_TITLE = "e2e-gfx-panel";

export interface KittyPanel {
  /** kitty window id (close-window / get-text matching). */
  readonly windowId: number;
  /** macOS CGWindowID of the OS panel, for `screencapture -l`. */
  readonly platformWindowId: number;
  /** Visible text of the panel's kitty window. */
  text(): Promise<string>;
  /** Screencapture the panel window (PNG, no shadow, no sound). */
  capture(outPath: string): Promise<void>;
  close(): Promise<void>;
}

/** Find the running kitty instance's remote control socket. */
async function findKittySocket(): Promise<string> {
  const entries = await fs.readdir("/tmp");
  const socket = entries.find((e) => /^kitty-\d+$/.test(e));
  if (!socket) {
    throw new Error(
      "No kitty socket found at /tmp/kitty-*. Is kitty running with allow_remote_control?",
    );
  }
  return `unix:/tmp/${socket}`;
}

interface KittyLsWindow {
  id: number;
  title: string;
}
interface KittyLsTab {
  windows: KittyLsWindow[];
}
interface KittyLsOsWindow {
  platform_window_id: number;
  tabs: KittyLsTab[];
}

async function platformWindowIdFor(socket: string, windowId: number): Promise<number> {
  const { stdout } = await execa("kitty", ["@", "--to", socket, "ls"]);
  const osWindows = JSON.parse(stdout) as KittyLsOsWindow[];
  for (const os of osWindows) {
    for (const tab of os.tabs) {
      if (tab.windows.some((w) => w.id === windowId)) return os.platform_window_id;
    }
  }
  throw new Error(`kitty window ${windowId} not found in kitty @ ls output`);
}

/**
 * Launch `command` in a fresh top-layer os-panel of the running kitty
 * instance. A leftover panel from an aborted run is closed first, never
 * reused (its process points at a dead session).
 */
export async function launchKittyPanel(
  command: string[],
  options: { lines?: number; columns?: number } = {},
): Promise<KittyPanel> {
  const socket = await findKittySocket();
  await execa("kitty", [
    "@",
    "--to",
    socket,
    "close-window",
    "--match",
    `title:^${PANEL_TITLE}$`,
    "--no-response",
  ]).catch(() => undefined);

  const { stdout } = await execa("kitty", [
    "@",
    "--to",
    socket,
    "launch",
    "--type=os-panel",
    "--keep-focus",
    "--title",
    PANEL_TITLE,
    "--os-panel",
    "edge=none",
    "--os-panel",
    "layer=top",
    "--os-panel",
    "focus-policy=not-allowed",
    "--os-panel",
    `lines=${options.lines ?? 35}`,
    "--os-panel",
    `columns=${options.columns ?? 120}`,
    "--",
    ...command,
  ]);
  const windowId = Number(stdout.trim());
  if (!Number.isInteger(windowId)) {
    throw new Error(`kitty @ launch did not return a window id: ${stdout}`);
  }
  const platformWindowId = await platformWindowIdFor(socket, windowId);

  return {
    windowId,
    platformWindowId,
    async text() {
      const { stdout: text } = await execa("kitty", [
        "@",
        "--to",
        socket,
        "get-text",
        "--match",
        `id:${windowId}`,
      ]);
      return text;
    },
    async capture(outPath: string) {
      await execa("screencapture", ["-x", "-o", "-l", String(platformWindowId), outPath]);
    },
    async close() {
      await execa("kitty", [
        "@",
        "--to",
        socket,
        "close-window",
        "--match",
        `id:${windowId}`,
        "--no-response",
      ]).catch(() => undefined);
    },
  };
}
