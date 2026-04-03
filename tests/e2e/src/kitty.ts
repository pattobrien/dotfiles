import fs from "node:fs/promises";

import { execa, execaCommand } from "execa";

import { type TmuxSession } from "./tmux.ts";

const E2E_WINDOW_TITLE = "e2e-test";

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

/** Check if the e2e-test kitty window already exists. */
async function kittyWindowExists(): Promise<boolean> {
  try {
    const { stdout } = await execaCommand(
      `osascript -e 'tell application "System Events" to tell process "kitty" to get title of every window'`,
      { shell: true },
    );
    return stdout.includes(E2E_WINDOW_TITLE);
  } catch {
    return false;
  }
}

/**
 * Get or create a persistent kitty OS window for e2e tests.
 *
 * Uses `kitty @` remote control to create a window within the existing kitty
 * process (shares the same dock icon). On subsequent runs, reuses the existing
 * window if it's still open.
 */
export async function getOrCreateKittyInstance(
  tmux: TmuxSession,
): Promise<KittyInstance> {
  if (!(await kittyWindowExists())) {
    const socket = await findKittySocket();
    await execa("kitty", [
      "@",
      "--to",
      socket,
      "launch",
      "--type=os-window",
      "--title",
      E2E_WINDOW_TITLE,
      "tmux",
      "-L",
      tmux.socket,
      "attach-session",
      "-t",
      tmux.session,
    ]);
    await new Promise((r) => setTimeout(r, 500));
  }

  return buildKittyInstance(tmux);
}

/** Raise the e2e-test kitty window to frontmost before sending keystrokes. */
async function focusKittyWindow() {
  await execaCommand(
    `osascript -e 'tell application "System Events" to tell process "kitty"
      perform action "AXRaise" of (first window whose title contains "${E2E_WINDOW_TITLE}")
      set frontmost to true
    end tell'`,
    { shell: true },
  );
  await new Promise((r) => setTimeout(r, 200));
}

function buildKittyInstance(tmux: TmuxSession): KittyInstance {
  return {
    tmux,

    async sendCmd(key: string) {
      await focusKittyWindow();
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
      await focusKittyWindow();
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
      await focusKittyWindow();
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
      await focusKittyWindow();
      await runAppleScript(`
        tell application "System Events"
          tell process "kitty"
            key code ${code}
          end tell
        end tell
      `);
      await new Promise((r) => setTimeout(r, 200));
    },
  };
}

async function runAppleScript(script: string) {
  await execaCommand(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
    shell: true,
  });
}
