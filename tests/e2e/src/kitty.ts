import fs from "node:fs/promises";

import { execa, execaCommand } from "execa";

import { type TmuxSession } from "./tmux.ts";

const E2E_WINDOW_TITLE = "e2e-test";
const E2E_WINDOW_VAR = "dotfiles_e2e_test";

interface KittyRemoteWindow {
  id: number;
  cmdline?: string[];
  created_at?: number;
  title?: string;
  user_vars?: Record<string, string>;
}

interface KittyRemoteTab {
  windows?: KittyRemoteWindow[];
}

interface KittyRemoteOsWindow {
  tabs?: KittyRemoteTab[];
}

export interface KittyInstance {
  /** The tmux session this kitty window is attached to. */
  tmux: TmuxSession;

  /**
   * Send a Cmd+key keystroke to the kitty window via AppleScript.
   * This triggers kitty's keybinding handler (e.g., Cmd+K → F12).
   */
  sendCmd: (key: string) => Promise<void>;

  /**
   * Send a Cmd+Shift+key keystroke to the kitty window via AppleScript.
   */
  sendCmdShift: (key: string) => Promise<void>;

  /**
   * Send a raw keystroke (no modifiers) to the kitty window via AppleScript.
   */
  sendKey: (key: string) => Promise<void>;

  /**
   * Send a key code to the kitty window via AppleScript.
   * Use for special keys like Escape (53), Return (36), etc.
   */
  sendKeyCode: (code: number) => Promise<void>;

  /**
   * Get the terminal text from kitty's perspective, optionally with ANSI
   * escape sequences preserved (useful for verifying OSC 8 hyperlinks, etc.).
   */
  getText: (opts?: { ansi?: boolean }) => Promise<string>;
}

/** Find the kitty remote control socket at /tmp/kitty-<PID>. */
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

async function listKittyWindows(socket: string): Promise<KittyRemoteWindow[]> {
  const { stdout } = await execa("kitty", ["@", "--to", socket, "ls"]);
  const osWindows = JSON.parse(stdout) as KittyRemoteOsWindow[];
  return osWindows.flatMap((osWindow) => (osWindow.tabs ?? []).flatMap((tab) => tab.windows ?? []));
}

/** Find the persistent e2e-test kitty window, if one already exists. */
async function findE2EWindowId(socket: string, tmux: TmuxSession): Promise<number | undefined> {
  const windows = await listKittyWindows(socket);
  const matches = windows.filter((window) => {
    if (window.user_vars?.[E2E_WINDOW_VAR] === "1") return true;
    if (window.title !== E2E_WINDOW_TITLE) return false;

    const cmdline = window.cmdline ?? [];
    return (
      cmdline.includes("tmux") &&
      cmdline.includes("-L") &&
      cmdline.includes(tmux.socket) &&
      cmdline.includes("-t") &&
      cmdline.includes(tmux.session)
    );
  });

  matches.sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
  return matches[0]?.id;
}

/**
 * Get or create a persistent kitty OS window for e2e tests.
 *
 * Uses `kitty @` remote control to create a window within the existing kitty
 * process (shares the same dock icon). On subsequent runs, reuses the existing
 * window if it's still open.
 */
export async function getOrCreateKittyInstance(tmux: TmuxSession): Promise<KittyInstance> {
  const socket = await findKittySocket();
  const existingWindowId = await findE2EWindowId(socket, tmux);
  const windowId =
    existingWindowId ??
    Number(
      (
        await execa("kitty", [
          "@",
          "--to",
          socket,
          "launch",
          "--type=os-window",
          "--title",
          E2E_WINDOW_TITLE,
          "--var",
          `${E2E_WINDOW_VAR}=1`,
          "tmux",
          "-L",
          tmux.socket,
          "attach-session",
          "-t",
          tmux.session,
        ])
      ).stdout.trim(),
    );

  if (!existingWindowId) {
    await new Promise((r) => setTimeout(r, 500));
  }

  return buildKittyInstance(tmux, socket, windowId);
}

async function focusKittyWindow(socket: string, windowId: number) {
  await execa("kitty", ["@", "--to", socket, "focus-window", "--match", `id:${windowId}`]);
  await new Promise((r) => setTimeout(r, 200));
}

function buildKittyInstance(tmux: TmuxSession, socket: string, windowId: number): KittyInstance {
  return {
    tmux,

    async sendCmd(key: string) {
      await focusKittyWindow(socket, windowId);
      await runAppleScript(`
        tell application "System Events"
          tell process "kitty"
            keystroke "${key}" using command down
          end tell
        end tell
      `);
      await new Promise((r) => setTimeout(r, 300));
    },

    async sendCmdShift(key: string) {
      await focusKittyWindow(socket, windowId);
      await runAppleScript(`
        tell application "System Events"
          tell process "kitty"
            keystroke "${key}" using {command down, shift down}
          end tell
        end tell
      `);
      await new Promise((r) => setTimeout(r, 300));
    },

    async sendKey(key: string) {
      await focusKittyWindow(socket, windowId);
      await runAppleScript(`
        tell application "System Events"
          tell process "kitty"
            keystroke "${key}"
          end tell
        end tell
      `);
      await new Promise((r) => setTimeout(r, 200));
    },

    async sendKeyCode(code: number) {
      await focusKittyWindow(socket, windowId);
      await runAppleScript(`
        tell application "System Events"
          tell process "kitty"
            key code ${code}
          end tell
        end tell
      `);
      await new Promise((r) => setTimeout(r, 200));
    },

    async getText(opts?: { ansi?: boolean }) {
      const args = ["@", "--to", socket, "get-text", "--match", `id:${windowId}`];
      if (opts?.ansi) args.push("--ansi");
      const { stdout } = await execa("kitty", args);
      return stdout;
    },
  };
}

async function runAppleScript(script: string) {
  await execaCommand(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
    shell: true,
  });
}
