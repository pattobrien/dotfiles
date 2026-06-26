import { execa } from "execa";
import { expect } from "vitest";

import { test } from "./fixtures.ts";

test(
  "OSC 8 hyperlinks with custom text are clickable in kitty + tmux",
  { tags: ["kitty"], timeout: 15_000 },
  async ({ kitty }) => {
    const { tmux } = kitty;

    await execa("tmux", ["-L", tmux.socket, "new-window", "-t", tmux.session]);

    try {
      // Print an OSC 8 hyperlink with custom text (not the raw URL)
      await tmux.sendKeys(
        `printf '\\e]8;;https://www.anthropic.com\\e\\\\Anthropic Homepage\\e]8;;\\e\\\\\\n'`,
        "Enter",
      );
      await tmux.waitForText("Anthropic Homepage");
      await new Promise((r) => setTimeout(r, 2000));

      // The real behavioral check: capture what kitty actually received.
      // `get-text --ansi` returns the terminal content with escape sequences.
      // If tmux forwards OSC 8 to kitty, the hyperlink wrapper will be present
      // around "Anthropic Homepage". If tmux strips it, only plain text appears.
      const ansiText = await kitty.getText({ ansi: true });

      expect(ansiText).toContain("\u001b]8;");
      expect(ansiText).toContain("https://www.anthropic.com");
    } finally {
      await execa("tmux", ["-L", tmux.socket, "kill-window", "-t", tmux.session]);
    }
  },
);
