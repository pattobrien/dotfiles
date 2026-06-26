import { execa } from "execa";
import { expect } from "vitest";

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
      await execa("tmux", ["-L", tmux.socket, "kill-window", "-t", tmux.session]);
    }
  },
);

test(
  "Cmd+Shift+D switches to dotfiles session via kitty → User12 → tmux relay",
  { tags: ["kitty"], timeout: 10_000 },
  async ({ kitty }) => {
    const { tmux } = kitty;
    const originalSession = tmux.session;

    const { stdout: clientTtys } = await execa("tmux", [
      "-L",
      tmux.socket,
      "list-clients",
      "-t",
      originalSession,
      "-F",
      "#{client_tty}",
    ]);
    const clientTty = clientTtys.trim().split("\n").find(Boolean);
    expect(clientTty).toBeTruthy();

    await execa("tmux", ["-L", tmux.socket, "new-session", "-d", "-A", "-s", "dotfiles"]);

    try {
      await execa("tmux", [
        "-L",
        tmux.socket,
        "switch-client",
        "-c",
        clientTty!,
        "-t",
        originalSession,
      ]);

      await kitty.sendCmdShift("d");
      await new Promise((r) => setTimeout(r, 500));

      const { stdout } = await execa("tmux", [
        "-L",
        tmux.socket,
        "display-message",
        "-c",
        clientTty!,
        "-p",
        "#{client_session}",
      ]);
      expect(stdout.trim()).toBe("dotfiles");
    } finally {
      await execa("tmux", [
        "-L",
        tmux.socket,
        "switch-client",
        "-c",
        clientTty!,
        "-t",
        originalSession,
      ]).catch(() => {});
      await execa("tmux", ["-L", tmux.socket, "kill-session", "-t", "dotfiles"]).catch(() => {});
    }
  },
);
