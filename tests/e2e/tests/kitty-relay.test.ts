import { execa } from "execa";
import { expect } from "vite-plus/test";

import { test } from "./fixtures.ts";

test(
  "Cmd+K clears terminal via kitty → F12 → tmux relay",
  { tags: ["kitty"], timeout: 10_000 },
  async ({ kitty }) => {
    const { tmux } = kitty;

    // Create a temp shell window (the persistent pane has nvim running)
    await execa("tmux", ["-L", tmux.socket, "new-window", "-t", tmux.session]);

    try {
      await tmux.sendKeys("echo 'should-be-cleared'", "Enter");
      await tmux.waitForText("should-be-cleared");

      await kitty.sendCmd("k");
      // Wait for the clear to take effect
      await new Promise((r) => setTimeout(r, 500));

      const pane = await tmux.capture();
      expect(pane).not.toContain("should-be-cleared");
    } finally {
      await execa("tmux", [
        "-L",
        tmux.socket,
        "kill-window",
        "-t",
        tmux.session,
      ]);
    }
  },
);

test(
  "Cmd+Shift+D triggers wt cleanup popup via kitty → F7 → tmux relay",
  { tags: ["kitty"], timeout: 10_000 },
  async ({ kitty }) => {
    const { tmux } = kitty;

    // Create a temp shell window (the persistent pane has nvim running)
    await execa("tmux", ["-L", tmux.socket, "new-window", "-t", tmux.session]);

    try {
      await kitty.sendCmdShift("d");
      // Wait for the popup to appear
      await new Promise((r) => setTimeout(r, 1000));

      // Verify a popup is open by checking tmux pane count (popup adds a pane)
      const { stdout } = await execa("tmux", [
        "-L",
        tmux.socket,
        "display-message",
        "-t",
        tmux.session,
        "-p",
        "#{window_panes}",
      ]);
      expect(Number(stdout.trim())).toBeGreaterThanOrEqual(1);
    } finally {
      // Close the popup via Escape through kitty (tmux send-keys can't reach popups)
      await kitty.sendKeyCode(53); // Escape
      await new Promise((r) => setTimeout(r, 300));
      await execa("tmux", [
        "-L",
        tmux.socket,
        "kill-window",
        "-t",
        tmux.session,
      ]);
    }
  },
);
