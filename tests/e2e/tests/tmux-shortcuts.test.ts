import { execa } from "execa";
import { expect } from "vitest";

import { test } from "./fixtures.ts";

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

test("Cmd relay F-key bindings are registered", async ({ tmux }) => {
  const keys = await tmux.listKeys("root");

  expect(keys).toMatch(/F11.*workmux dashboard/);
  expect(keys).toMatch(/F10.*tmux-jump-dev/);
  expect(keys).toMatch(/F9.*tmux-session-picker/);
  expect(keys).toMatch(/F8.*last-window/);
  expect(keys).toMatch(/F7.*display-popup/);
  expect(keys).toMatch(/F6.*source-file .*\.tmux\.conf/);
  expect(keys).toMatch(/F5.*tmux-jump-or-create claude/);
  expect(keys).toMatch(/F4.*resize-pane -Z/);
  expect(keys).toMatch(/F3.*kill-pane/);
  expect(keys).toMatch(/F2.*new-window/);
});

test("Cmd relay user-key session and window bindings are registered", async ({ tmux }) => {
  const keys = await tmux.listKeys("root");

  expect(keys).toMatch(/User0.*tmux-jump-or-create nvim nvim/);
  expect(keys).toMatch(/User1.*tmux-jump zsh/);
  expect(keys).toMatch(/User2.*select-window -t :1/);
  expect(keys).toMatch(/User10.*select-window -t :9/);
  expect(keys).toMatch(/User11.*switch-client -l/);
  expect(keys).toMatch(/User12.*switch-client -t dotfiles/);
  expect(keys).toMatch(/User13.*switch-client -t notes/);
  expect(keys).toMatch(/User14.*switch-client -t main/);
  expect(keys).toMatch(/User15.*display-menu/);
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
