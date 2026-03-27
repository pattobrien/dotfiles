import { parse } from "shell-quote";

// ─── Blocked commands ────────────────────────────────────────────
// Add new entries here to block additional commands.
export const BLOCKED: Record<string, string> = {
  npx: "use `pnpx` instead of `npx`",
  tsc: "use oxlint's built-in tsgo type-check via `pnpm lint` instead of `tsc`",
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
 * Check a shell command string against a blocked commands map.
 * Returns the denial reason if a blocked command is found, or null if allowed.
 */
export function checkCommand(
  command: string,
  blocked: Record<string, string>
): string | null {
  const tokens = parse(command);
  const invoked = extractCommands(tokens);
  for (const cmd of invoked) {
    if (cmd in blocked) return blocked[cmd];
  }
  return null;
}
