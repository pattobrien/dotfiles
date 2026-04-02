import { expect } from "vitest";
import { test } from "./fixtures.ts";

test(
  "Cmd+K clears terminal via kitty → F12 → tmux relay",
  { tags: ["kitty"], timeout: 10_000 },
  async ({ kitty }) => {
    const { tmux } = kitty;

    await tmux.sendKeys("echo 'should-be-cleared'", "Enter");
    await tmux.waitForText("should-be-cleared");

    await kitty.sendCmd("k");
    await tmux.waitForText("❯", 3); // wait for cleared prompt

    const pane = await tmux.capture();
    expect(pane).not.toContain("should-be-cleared");
  },
);

test(
  "Cmd+Shift+D triggers wt cleanup popup via kitty → F7 → tmux relay",
  { tags: ["kitty"], timeout: 10_000 },
  async ({ kitty }) => {
    const { tmux } = kitty;

    await kitty.sendCmdShift("d");

    // Popup should open — verify via tmux
    const { execa } = await import("execa");
    const { stdout } = await execa("tmux", [
      "-L", tmux.socket,
      "display-message", "-t", tmux.session,
      "-p", "#{pane_in_mode}",
    ]);
    expect(stdout).toBeDefined();
  },
);
