import { execaCommand } from "execa";
import { type TmuxSession } from "./tmux.ts";

export interface KittyInstance {
  /** The kitty window title. */
  title: string;
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
}

/**
 * Launch a kitty window attached to a tmux session.
 * Requires kitty to be installed and `allow_remote_control yes` in kitty.conf.
 */
export async function createKittyInstance(
  tmux: TmuxSession,
): Promise<KittyInstance> {
  const title = `e2e-${tmux.session}`;

  // Launch kitty with a specific title, attached to the tmux session
  await execaCommand(
    `kitty --title "${title}" -e tmux -L ${tmux.socket} attach-session -t ${tmux.session} &`,
    { shell: true },
  );

  // Wait for the kitty window to appear
  await new Promise((r) => setTimeout(r, 1000));

  // Focus the kitty window
  await runAppleScript(`
    tell application "kitty" to activate
    delay 0.3
  `);

  return {
    title,
    tmux,

    async sendCmd(key: string) {
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
      await runAppleScript(`
        tell application "System Events"
          tell process "kitty"
            keystroke "${key}"
          end tell
        end tell
      `);
      await new Promise((r) => setTimeout(r, 200));
    },
  };
}

/** Close the kitty window by title. */
export async function destroyKittyInstance(kitty: KittyInstance) {
  // Close just the test window, not all of kitty
  await runAppleScript(`
    tell application "kitty"
      set windowList to every window
      repeat with w in windowList
        if name of w contains "${kitty.title}" then
          close w
        end if
      end repeat
    end tell
  `).catch(() => {});
}

async function runAppleScript(script: string) {
  await execaCommand(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
    shell: true,
  });
}
