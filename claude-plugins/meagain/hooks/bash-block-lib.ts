import { parse } from "shell-quote";

// ─── Blocked commands ────────────────────────────────────────────
// Add new entries here to block additional commands.
export const BLOCKED: Record<string, string> = {
  npx: "use `pnpx` instead of `npx`",
};

/** Blocked anywhere in the command (as a command name or argument). */
export const BLOCKED_ANYWHERE: Record<string, string> = {
  tsc: "use `vp lint` (oxlint + tsgo type-check) instead of `tsc`",
  prettier:
    "use `vp fmt` (oxfmt) instead of `prettier`",
};
// ─────────────────────────────────────────────────────────────────

/** Extract command names in "command position" (start of line or after an operator). */
export function extractCommands(tokens: ReturnType<typeof parse>): string[] {
  const cmds: string[] = [];
  let expectCmd = true;
  for (const token of tokens) {
    if (typeof token === "object" && "op" in token) {
      expectCmd = true;
    } else if (typeof token === "string" && expectCmd) {
      cmds.push(token);
      expectCmd = false;
    } else {
      expectCmd = false;
    }
  }
  return cmds;
}

/**
 * Check a shell command string against blocked commands maps.
 * `blocked` matches only command-position tokens.
 * `blockedAnywhere` matches any token (command or argument).
 * Returns the denial reason if a blocked command is found, or null if allowed.
 */
export function checkCommand(
  command: string,
  blocked: Record<string, string>,
  blockedAnywhere: Record<string, string> = {},
): string | null {
  const tokens = parse(command);
  const invoked = extractCommands(tokens);
  for (const cmd of invoked) {
    if (cmd in blocked) return blocked[cmd];
  }
  // Check all string tokens against blockedAnywhere
  for (const token of tokens) {
    if (typeof token === "string" && token in blockedAnywhere) {
      return blockedAnywhere[token];
    }
  }
  return null;
}
