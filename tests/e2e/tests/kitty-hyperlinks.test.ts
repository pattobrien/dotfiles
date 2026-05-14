import { execa } from "execa";
import { expect } from "vite-plus/test";

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

      // Match the OSC 8 opening sequence in kitty's output.
      // The printf command itself contains the literal string "\e]8;;" but that
      // won't have a real ESC byte — we need to match the actual escape sequence
      // that wraps the *output* line "Anthropic Homepage".
      // tmux may add its own id param (e.g. "id=tmux1;") before the URL
      expect(ansiText).toMatch(/\x1b\]8;[^;]*;https:\/\/www\.anthropic\.com/);
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
