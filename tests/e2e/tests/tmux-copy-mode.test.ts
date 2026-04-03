import { execa } from "execa";
import { expect } from "vite-plus/test";

import { test } from "./fixtures.ts";

test("vi copy mode bindings are registered", async ({ tmux }) => {
  const keys = await tmux.listKeys("copy-mode-vi");
  expect(keys).toMatch(/v\s+send-keys -X begin-selection/);
  expect(keys).toMatch(/y\s+send-keys -X copy-selection-and-cancel/);
});

test("copy mode can be entered and exited", async ({ tmux }) => {
  // Use a temporary window with a shell (the main pane has nvim running)
  await execa("tmux", ["-L", tmux.socket, "new-window", "-t", tmux.session]);

  try {
    await tmux.sendKeys("echo 'copy-mode-test'", "Enter");
    await tmux.waitForText("copy-mode-test");

    await tmux.runCommand("copy-mode");

    const { stdout: mode } = await execa("tmux", [
      "-L",
      tmux.socket,
      "display-message",
      "-t",
      tmux.session,
      "-p",
      "#{pane_mode}",
    ]);
    expect(mode.trim()).toBe("copy-mode");

    await tmux.sendKeys("q");

    const { stdout: modeAfter } = await execa("tmux", [
      "-L",
      tmux.socket,
      "display-message",
      "-t",
      tmux.session,
      "-p",
      "#{pane_mode}",
    ]);
    expect(modeAfter.trim()).toBe("");
  } finally {
    await execa("tmux", ["-L", tmux.socket, "kill-window", "-t", tmux.session]);
  }
});

test("mode-keys is set to vi", async ({ tmux }) => {
  const { stdout } = await execa("tmux", [
    "-L",
    tmux.socket,
    "show-window-options",
    "-g",
    "mode-keys",
  ]);
  expect(stdout).toContain("vi");
});
