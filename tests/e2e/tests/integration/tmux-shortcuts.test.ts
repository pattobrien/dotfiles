import { execa } from "execa";
import { expect } from "vite-plus/test";

import { test } from "../fixtures.ts";

test("prefix | is bound to split-window -h", async ({ tmux }) => {
  const keys = await tmux.listKeys("prefix");
  expect(keys).toMatch(/\|\s+split-window -h/);
});

test("prefix - is bound to split-window -v", async ({ tmux }) => {
  const keys = await tmux.listKeys("prefix");
  expect(keys).toMatch(/-\s+split-window -v/);
});

test("split-window -h creates a horizontal split", async ({ tmux }) => {
  // Use a temporary window to avoid leaving panes in the persistent session
  await execa("tmux", ["-L", tmux.socket, "new-window", "-t", tmux.session]);

  try {
    await tmux.runCommand("split-window", "-h");

    const panes = await tmux.runCommand("list-panes");
    const paneCount = panes.trim().split("\n").length;
    expect(paneCount).toBe(2);
  } finally {
    await execa("tmux", ["-L", tmux.socket, "kill-window", "-t", tmux.session]);
  }
});

test("F12 is bound to clear screen and history", async ({ tmux }) => {
  const keys = await tmux.listKeys("root");
  expect(keys).toContain("F12");
  expect(keys).toMatch(/F12.*clear-history/);
});

test("F-key bindings match the current Cmd-relay map", async ({ tmux }) => {
  const keys = await tmux.listKeys("root");

  // Cmd+E → F11: workmux dashboard popup
  expect(keys).toMatch(/F11.*workmux dashboard/);
  // Cmd+L → F10: logger role (pnpm dev window jump)
  expect(keys).toMatch(/F10.*tmux-jump-dev/);
  // Cmd+Shift+R → F9: fzf session picker popup
  expect(keys).toMatch(/F9.*tmux-session-picker/);
  // Cmd+; → F8: toggle last window
  expect(keys).toMatch(/F8\s+last-window/);
  // Cmd+/ → F7: scratch popup shell
  expect(keys).toMatch(/F7\s+display-popup/);
  // Cmd+R → F6: reload tmux config
  expect(keys).toMatch(/F6\s+source-file/);
  // Cmd+A → F5: ai role (claude window jump)
  expect(keys).toMatch(/F5.*tmux-jump-or-create claude/);
  // Cmd+T/W/Enter → F2/F3/F4: window and pane management
  expect(keys).toMatch(/F2\s+new-window/);
  expect(keys).toMatch(/F3\s+kill-pane/);
  expect(keys).toMatch(/F4\s+resize-pane -Z/);
  // Cmd+N → User0 (extended F-key via user-keys): nvim role jump
  expect(keys).toMatch(/User0.*tmux-jump-or-create nvim/);
});

test("prefix m toggles pane zoom", async ({ tmux }) => {
  // Use a temporary window to avoid leaving state in the persistent session
  await execa("tmux", ["-L", tmux.socket, "new-window", "-t", tmux.session]);

  try {
    await tmux.runCommand("split-window", "-h");
    await tmux.runCommand("resize-pane", "-Z");

    const { stdout } = await execa("tmux", [
      "-L",
      tmux.socket,
      "display-message",
      "-t",
      tmux.session,
      "-p",
      "#{window_zoomed_flag}",
    ]);
    expect(stdout.trim()).toBe("1");
  } finally {
    await execa("tmux", ["-L", tmux.socket, "kill-window", "-t", tmux.session]);
  }
});
