import { expect } from "vite-plus/test";
import { execa } from "execa";
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
  await tmux.runCommand("split-window", "-h");

  const panes = await tmux.runCommand("list-panes");
  const paneCount = panes.trim().split("\n").length;
  expect(paneCount).toBe(2);

  // Clean up: kill the temporary window, returning to the original
  await execa("tmux", ["-L", tmux.socket, "kill-window", "-t", tmux.session]);
});

test("F12 is bound to clear screen and history", async ({ tmux }) => {
  const keys = await tmux.listKeys("root");
  expect(keys).toContain("F12");
  expect(keys).toMatch(/F12.*clear-history/);
});

test("F-key popup bindings are registered", async ({ tmux }) => {
  const keys = await tmux.listKeys("root");

  // Cmd+E → F11: workmux dashboard
  expect(keys).toMatch(/F11.*workmux dashboard/);
  // Cmd+L → F10: wt list
  expect(keys).toMatch(/F10.*wt list/);
  // Cmd+J → F9: wt projects switch
  expect(keys).toMatch(/F9.*wt projects switch/);
  // Cmd+; → F8: wt claude
  expect(keys).toMatch(/F8.*wt claude/);
  // Cmd+Shift+D → F7: wt cleanup
  expect(keys).toMatch(/F7.*wt cleanup/);
  // Cmd+Shift+K → F6: wt dev kill
  expect(keys).toMatch(/F6.*wt dev kill/);
  // Cmd+Shift+P → F5: wt dev list
  expect(keys).toMatch(/F5.*wt dev list/);
  // Cmd+Shift+R → F4: wt dev start
  expect(keys).toMatch(/F4.*wt dev start/);
});

test("prefix m toggles pane zoom", async ({ tmux }) => {
  // Use a temporary window to avoid leaving state in the persistent session
  await execa("tmux", ["-L", tmux.socket, "new-window", "-t", tmux.session]);
  await tmux.runCommand("split-window", "-h");
  await tmux.runCommand("resize-pane", "-Z");

  const { stdout } = await execa("tmux", [
    "-L", tmux.socket,
    "display-message", "-t", tmux.session,
    "-p", "#{window_zoomed_flag}",
  ]);
  expect(stdout.trim()).toBe("1");

  await execa("tmux", ["-L", tmux.socket, "kill-window", "-t", tmux.session]);
});
