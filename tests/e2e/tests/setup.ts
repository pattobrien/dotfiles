import { terminalMatchers } from "@termless/test/matchers";
import { expect } from "vite-plus/test";

/**
 * Worker-level env hygiene: the test runner itself runs inside the live
 * herdr session (and possibly tmux), and Termless merges process.env under
 * every PTY spawn — so inherited session vars must be removed here, at the
 * source, or every spawned process would see them. Without this, `herdr
 * --session` refuses to start (nested-herdr guard trips on HERDR_ENV=1).
 */
for (const key of Object.keys(process.env)) {
  if (key.startsWith("HERDR_") || key.startsWith("TMUX")) {
    delete process.env[key];
  }
}

expect.extend(terminalMatchers);
